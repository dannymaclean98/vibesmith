import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TrackData {
  track_id: string;
  track_name: string;
  shared_by: string;
  share_date: string;
  message_id: number;
  message_guid: string;
  image_url: string;
  preview_url: string | null;
  artist: string;
  album: string;
}

interface ReactionData {
  track_id: string;
  message_guid: string;
  reactor: string;
  reaction_text: string;
  reaction_date: string;
}

// Phone number to display name mapping - customize as needed
const PHONE_NAMES: Record<string, string> = {
  // Add mappings like: '+12149014824': 'Daniel',
};

// Gradient colors for members
const MEMBER_COLORS = [
  'from-violet-500 to-fuchsia-500',
  'from-blue-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-purple-500',
  'from-red-500 to-pink-500',
  'from-green-500 to-lime-500',
];

function normalizePhone(phone: string): string {
  // Remove + and any non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add US country code if it's a 10-digit number (matches auth.ts normalization)
  if (digits.length === 10) {
    return `1${digits}`;
  }
  
  return digits;
}

function formatPhoneNumber(phone: string): string {
  const digits = normalizePhone(phone);
  
  // Format as (XXX) XXX-XXXX for 10-digit or 11-digit (with country code) numbers
  if (digits.length === 11 && digits.startsWith('1')) {
    // US number with country code: 1XXXXXXXXXX -> (XXX) XXX-XXXX
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    // US number without country code: XXXXXXXXXX -> (XXX) XXX-XXXX
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // For other formats, just return the digits
  return digits;
}

function getDisplayName(sharedBy: string): string {
  if (sharedBy === 'Unknown' || sharedBy === 'You') {
    return sharedBy;
  }
  
  // Check for custom mapping
  if (PHONE_NAMES[sharedBy]) {
    return PHONE_NAMES[sharedBy];
  }
  
  // Format phone number nicely for unclaimed numbers
  return formatPhoneNumber(sharedBy);
}

async function importData() {
  console.log('Starting data import (preserving existing data)...\n');

  // Read JSON files
  const tracksPath = path.join(process.cwd(), 'exports', 'tracks.json');
  const reactionsPath = path.join(process.cwd(), 'exports', 'reactions.json');

  if (!fs.existsSync(tracksPath)) {
    console.error('tracks.json not found at:', tracksPath);
    process.exit(1);
  }

  const tracks: TrackData[] = JSON.parse(fs.readFileSync(tracksPath, 'utf-8'));
  console.log(`Loaded ${tracks.length} tracks from JSON`);

  let reactions: ReactionData[] = [];
  if (fs.existsSync(reactionsPath)) {
    reactions = JSON.parse(fs.readFileSync(reactionsPath, 'utf-8'));
    console.log(`Loaded ${reactions.length} reactions from JSON`);
  }

  // Get existing counts for comparison
  const existingMembers = await prisma.member.count();
  const existingTracks = await prisma.track.count();
  const existingReactions = await prisma.reaction.count();
  console.log(`\nExisting data: ${existingMembers} members, ${existingTracks} tracks, ${existingReactions} reactions`);

  // Extract unique members from tracks and reactions
  const memberPhones = new Set<string>();
  
  for (const track of tracks) {
    if (track.shared_by && track.shared_by !== 'Unknown') {
      memberPhones.add(track.shared_by);
    }
  }
  
  for (const reaction of reactions) {
    if (reaction.reactor && reaction.reactor !== 'You') {
      memberPhones.add(reaction.reactor);
    }
  }

  // Upsert members (create if not exists, preserve existing data)
  console.log(`\nProcessing ${memberPhones.size} members...`);
  const memberMap = new Map<string, string>(); // phone -> memberId
  
  let membersCreated = 0;
  let membersExisting = 0;
  let colorIndex = await prisma.member.count(); // Start color index after existing members
  
  for (const phone of memberPhones) {
    const normalizedPhone = normalizePhone(phone);
    
    // Check if member already exists
    const existingMember = await prisma.member.findUnique({
      where: { phone: normalizedPhone },
    });
    
    if (existingMember) {
      // Member exists - preserve their data, just add to our map
      memberMap.set(phone, existingMember.id);
      memberMap.set(normalizedPhone, existingMember.id);
      membersExisting++;
    } else {
      // Create new member
      const displayName = getDisplayName(phone);
      const member = await prisma.member.create({
        data: {
          name: displayName,
          phone: normalizedPhone,
          color: MEMBER_COLORS[colorIndex % MEMBER_COLORS.length],
        },
      });
      
      memberMap.set(phone, member.id);
      memberMap.set(normalizedPhone, member.id);
      console.log(`  Created member: ${displayName} (${normalizedPhone})`);
      membersCreated++;
      colorIndex++;
    }
  }
  
  console.log(`  ${membersCreated} new members created, ${membersExisting} already existed`);

  // Upsert tracks (create if not exists by messageId)
  console.log(`\nProcessing ${tracks.length} tracks...`);
  const trackMap = new Map<string, string>(); // message_guid -> trackId
  
  // First, load existing tracks into trackMap
  const existingTracksWithMessageId = await prisma.track.findMany({
    where: { messageId: { not: null } },
    select: { id: true, messageId: true },
  });
  for (const t of existingTracksWithMessageId) {
    if (t.messageId) {
      trackMap.set(t.messageId, t.id);
    }
  }
  
  let tracksCreated = 0;
  let tracksSkipped = 0;
  let tracksNoSender = 0;
  
  for (const track of tracks) {
    // Skip if we already have this track
    if (trackMap.has(track.message_guid)) {
      tracksSkipped++;
      continue;
    }
    
    const senderId = memberMap.get(track.shared_by);
    if (!senderId) {
      tracksNoSender++;
      continue;
    }
    
    try {
      const dbTrack = await prisma.track.create({
        data: {
          spotifyTrackId: track.track_id,
          spotifyUrl: `https://open.spotify.com/track/${track.track_id}`,
          trackName: track.track_name,
          artistName: track.artist,
          albumName: track.album,
          albumImageUrl: track.image_url,
          previewUrl: track.preview_url,
          senderId: senderId,
          sentAt: new Date(track.share_date),
          messageId: track.message_guid,
        },
      });
      
      trackMap.set(track.message_guid, dbTrack.id);
      tracksCreated++;
      
      if (tracksCreated % 100 === 0) {
        console.log(`  Created ${tracksCreated} new tracks...`);
      }
    } catch (error) {
      // Handle unique constraint violation (shouldn't happen but just in case)
      tracksSkipped++;
    }
  }
  
  console.log(`  ${tracksCreated} new tracks created, ${tracksSkipped} already existed, ${tracksNoSender} skipped (no sender)`);

  // Upsert reactions from JSON (preserves all existing reactions including UI-added ones)
  if (reactions.length > 0) {
    console.log(`\nProcessing ${reactions.length} reactions from JSON...`);
    
    let reactionsCreated = 0;
    let reactionsExisting = 0;
    let reactionsSkipped = 0;
    
    for (const reaction of reactions) {
      // Find the track by message_guid
      const trackId = trackMap.get(reaction.message_guid);
      if (!trackId) {
        reactionsSkipped++;
        continue;
      }
      
      // Get the reactor's member ID
      const reactorId = memberMap.get(reaction.reactor);
      if (!reactorId) {
        if (reaction.reactor !== 'You') {
          // Only warn for non-"You" reactors
          reactionsSkipped++;
        } else {
          reactionsSkipped++;
        }
        continue;
      }
      
      // Check if this exact reaction already exists
      const existingReaction = await prisma.reaction.findFirst({
        where: {
          trackId: trackId,
          memberId: reactorId,
          emoji: reaction.reaction_text,
        },
      });
      
      if (existingReaction) {
        reactionsExisting++;
        continue;
      }
      
      try {
        await prisma.reaction.create({
          data: {
            emoji: reaction.reaction_text,
            trackId: trackId,
            memberId: reactorId,
            reactedAt: new Date(reaction.reaction_date),
          },
        });
        reactionsCreated++;
      } catch (error) {
        // Unique constraint violation
        reactionsExisting++;
      }
    }
    
    console.log(`  ${reactionsCreated} new reactions created, ${reactionsExisting} already existed, ${reactionsSkipped} skipped`);
  }

  console.log('\n✅ Import complete!');
  
  // Print summary
  const finalMembers = await prisma.member.count();
  const finalTracks = await prisma.track.count();
  const finalReactions = await prisma.reaction.count();
  
  console.log('\nDatabase summary:');
  console.log(`  Members: ${existingMembers} → ${finalMembers} (+${finalMembers - existingMembers})`);
  console.log(`  Tracks: ${existingTracks} → ${finalTracks} (+${finalTracks - existingTracks})`);
  console.log(`  Reactions: ${existingReactions} → ${finalReactions} (+${finalReactions - existingReactions})`);
  console.log('\n💡 All existing data (including UI-added reactions) has been preserved!');
}

importData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

