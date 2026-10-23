const sanitizeAlarmId = (name) => name.replace(/[^A-Za-z0-9._-]+/g, '-');

const alarmSignature = (alarm) => sanitizeAlarmId(alarm.name);

export { alarmSignature, sanitizeAlarmId };
