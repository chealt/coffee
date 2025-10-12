import { createClient } from '@libsql/client';

const authToken = process.env.TURSO_DEFAULT_TOKEN;
const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!authToken) {
  throw new Error('TURSO_DEFAULT_TOKEN is not set');
}

const client = createClient({
  url: databaseUrl,
  authToken
});

const varieties = [
  'AB3',
  'Anacafe 14',
  'Batian',
  'Bourbon',
  'Bourbon Mayaguez 139',
  'Bourbon Mayaguez 71',
  'BPL10',
  'Caripe',
  'Casiopea',
  'Catigua MG2',
  'Catimor 129',
  'Catisic',
  'Catuai',
  'Caturra',
  'Centroamericano',
  'Costa Rica 95',
  'Cuscatleco',
  'EC15',
  'Esperanza',
  'Evaluna',
  'Fronton',
  'Geisha',
  'H3',
  'Harar Rwanda',
  'IAPAR 59',
  'IHCAFE 90',
  'IPR 103',
  'IPR 107',
  'Jackson 2/1257',
  'Java',
  'K7',
  'Kartika 1',
  'KP423',
  'Lempira',
  'Limani',
  'Maragogipe',
  'Marsellesa',
  'Mibirizi',
  'Milenio',
  'Monte Claro',
  'Mundo Maya',
  'Mundo Novo',
  'Nayarita',
  'Nemaya',
  'Nyasaland',
  'Obata',
  'Oro Azteca',
  'Pacamara',
  'Pacas',
  'Pache',
  'Parainema',
  'Paraiso',
  'Pop3303/21',
  'RAB C15',
  'Ruiru 11',
  'S4808',
  'S795',
  'SL14',
  'SL28',
  'SL34',
  'Sln.5B',
  'Sln.6',
  'Starmaya',
  'T5175',
  'T5296',
  'T8667',
  'Tekisic',
  'Typica',
  'Venecia',
  'Villa Sarchi'
];

await client.batch(
  varieties.map((name) => ({
    sql: 'INSERT OR IGNORE INTO varieties (name) VALUES (:name)',
    args: { name }
  }))
);
