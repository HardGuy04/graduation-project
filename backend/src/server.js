// dotenv phải load ĐẦU TIÊN để biến môi trường sẵn sàng trước khi db.js import
import 'dotenv/config';
import app from './app.js';

const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log(`MediCare Hub API — http://localhost:${PORT}`);
});
