const moment = require('moment');

const checkTimeConflict = (existingSlots, newSlot) => {
  const conflicts = [];

  for (const slot of existingSlots) {
    const existingStart = new Date(slot.startTime).getTime();
    const existingEnd = new Date(slot.endTime).getTime();
    const newStart = new Date(newSlot.startTime).getTime();
    const newEnd = new Date(newSlot.endTime).getTime();

    if (newStart < existingEnd && newEnd > existingStart) {
      conflicts.push({ slot, overlap: Math.min(existingEnd, newEnd) - Math.max(existingStart, newStart)
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
    conflictCount: conflicts.length
  };
};

const findAvailableSlots = (interviewerSlots, candidateSlots, durationMinutes = 60) => {
  const availableSlots = [];
  const today = moment().startOf('day');

  for (let day = 1; day <= 7; day++) {
    const currentDate = today.clone().add(day, 'days');
    const dayOfWeek = currentDate.day();

    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (let hour = 9; hour < 18; hour++) {
      const startTime = currentDate.clone().hour(hour).minute(0).second(0);
      const endTime = startTime.clone().add(durationMinutes, 'minutes');

      const slot = {
        date: currentDate.format('YYYY-MM-DD'),
        startTime: startTime.format('HH:mm'),
        endTime: endTime.format('HH:mm'),
        startDateTime: startTime.toDate(),
        endDateTime: endTime.toDate(),
        dayOfWeek
      };

      const hasConflict = interviewerSlots.some(s =>
        startTime.isBefore(s.endTime) && endTime.isAfter(s.startTime)
      ) || candidateSlots.some(s =>
        startTime.isBefore(s.endTime) && endTime.isAfter(s.startTime)
      );

      if (!hasConflict) {
        availableSlots.push(slot);
      }
    }
  }

  return availableSlots;
};

const suggestBestSlots = (availableSlots, count = 5) => {
  return availableSlots
    .map(slot => {
      let score = 10;

      const hour = parseInt(slot.startTime.split(':')[0]);
      if (hour >= 10 && hour < 11) score += 5;
      else if (hour >= 11 && hour < 12) score += 3;
      else if (hour >= 14 && hour < 16) score += 2;

      if (slot.dayOfWeek >= 2 && slot.dayOfWeek <= 4) score += 3;

      return { ...slot, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
};

module.exports = {
  checkTimeConflict,
  findAvailableSlots,
  suggestBestSlots
};
