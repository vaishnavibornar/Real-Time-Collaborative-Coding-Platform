/**
 * Room State Store
 *
 * An in-memory cache mapping room IDs to their respective active configurations.
 * e.g., roomStates['room-abc'] = { language: 'javascript' }
 *
 * This state is shared across socket event handlers (room handlers, language handlers)
 * to maintain synchronization when new users join or when updates occur.
 */
const roomStates = {};

module.exports = roomStates;
