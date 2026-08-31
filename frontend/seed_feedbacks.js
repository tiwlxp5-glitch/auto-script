import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ieomclhmsmskxblcmxpc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imllb21jbGhtc21za3hibGNteHBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQwMTM0NSwiZXhwIjoyMTAyOTc3MzQ1fQ.LsiQdP0yVpW9YluGdQM99hjXkZb7OCJ_JQTIOIVYMWM'
);

async function seed() {
  console.log('Fetching a user...');
  const { data: users, error: errUser } = await supabase.auth.admin.listUsers();
  
  if (errUser || !users.users.length) {
    console.error('Failed to fetch users or no users exist', errUser);
    return;
  }

  const userId = users.users[0].id;
  console.log('Using User ID:', userId);

  console.log('Inserting mock feedbacks...');
  const mockFeedbacks = [
    {
      user_id: userId,
      rating: 5,
      comment: "เขียนสคริปต์ได้ปังมาก! เอาไปอัดคลิปแล้วยอดขายพุ่งจริงๆ ปกติคิดคอนเทนต์เองใช้เวลาเป็นวัน แต่อันนี้ 10 วิเสร็จ คุ้มค่ามากค่ะ",
      is_featured: true
    },
    {
      user_id: userId,
      rating: 5,
      comment: "ชอบโหมด Belief Shifting มากครับ วิเคราะห์จิตวิทยาลูกค้าได้ลึกมาก เอาไปยิงแอดแล้วค่าแอดถูกลงชัดเจน",
      is_featured: true
    },
    {
      user_id: userId,
      rating: 4,
      comment: "ประหยัดเวลาทำคลิปไปได้เยอะเลย ชอบที่มีท่าทางประกอบให้ด้วย ท่องตามง่ายมาก มือใหม่ก็ทำคลิปโปรได้",
      is_featured: true
    },
    {
      user_id: userId,
      rating: 5,
      comment: "Auto Script V2 โหดจริงครับ ฮุกแต่ละอันหยุดนิ้วคนดูได้อยู่หมัด จากยอดวิวหลักร้อย ตอนนี้ทะลุหมื่นแล้ว!",
      is_featured: true
    }
  ];

  const { data, error } = await supabase
    .from('feedbacks')
    .insert(mockFeedbacks)
    .select();

  if (error) {
    console.error('Error inserting feedbacks:', error);
  } else {
    console.log('Successfully inserted', data.length, 'featured feedbacks!');
  }
}

seed();
