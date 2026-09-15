/**
 * Тестовий запит з коректним UTF-8 (без проблем PowerShell).
 * Запуск: npm run test:reading
 */
import 'dotenv/config';

const baseUrl = process.env.PUBLIC_BASE_URL || 'https://testtaro.onrender.com';
const apiSecret = process.env.API_SECRET;

if (!apiSecret) {
  console.error('API_SECRET не знайдено в .env');
  process.exit(1);
}

const body = {
  username: 'AdamTest',
  question: 'Чи варто мені змінити роботу?',
};

const response = await fetch(`${baseUrl}/api/readings`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'X-API-Key': apiSecret,
  },
  body: JSON.stringify(body),
});

const data = await response.json();
console.log('Status:', response.status);
console.log('Response:', data);

if (data.id) {
  console.log('\nЧекаємо 25 сек і перевіряємо питання...');
  await new Promise((r) => setTimeout(r, 25000));

  const check = await fetch(`${baseUrl}/api/readings/${data.id}`, {
    headers: { 'X-API-Key': apiSecret },
  });
  const reading = await check.json();
  console.log('\nЗбережене питання:', reading.question);
  console.log('Статус:', reading.status);
  console.log('Карта:', reading.drawnCard?.card?.nameUk);
}
