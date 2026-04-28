# 🎮 Connect Four - เกมเรียง 4

เกม Connect Four แบบเต็มรูปแบบพร้อม AI ที่ใช้ Minimax Algorithm และ Alpha-Beta Pruning

## ✨ คุณสมบัติ

### 🎯 เกมเพลย์หลัก
- กระดาน 7 คอลัมน์ × 6 แถว
- ระบบแรงโน้มถ่วง (แผ่นตกลงมาด้านล่าง)
- ตรวจจับการชนะ: แนวนอน, แนวตั้ง, แนวทแยง
- ไฮไลท์แผ่นที่ชนะพร้อมแอนิเมชัน
- ตรวจจับเสมอเมื่อกระดานเต็ม

### 🤖 โหมด AI
- **ง่าย**: AI เดินแบบสุ่ม
- **ปานกลาง**: Minimax depth 3
- **ยาก**: Minimax depth 5 พร้อม evaluation function

### 🎨 UI/UX
- ดีไซน์ทันสมัยและสวยงาม
- แอนิเมชันการตกของแผ่น
- Responsive (รองรับมือถือและเดสก์ท็อป)
- สีสันสดใส (แดง vs เหลือง)

### 🎮 ฟีเจอร์เพิ่มเติม
- ปุ่มเริ่มเกมใหม่
- ปุ่มย้อนกลับ (Undo)
- สลับโหมด 2 ผู้เล่น / เล่นกับ AI
- เลือกระดับความยาก

## 🚀 วิธีเล่น

### เปิดเกม
1. เปิดไฟล์ `index.html` ในเว็บเบราว์เซอร์
2. เลือกโหมดเกม:
   - **👥 2 ผู้เล่น**: เล่นกับเพื่อน
   - **🤖 เล่นกับ AI**: เล่นกับคอมพิวเตอร์

### กติกา
1. ผู้เล่นสลับกันวางแผ่นสี
2. คลิกที่คอลัมน์ที่ต้องการวางแผ่น
3. แผ่นจะตกลงไปที่ตำแหน่งว่างล่างสุด
4. ผู้เล่นที่เรียงแผ่นได้ 4 แผ่นติดกันก่อนชนะ
5. เรียงได้ทั้งแนวนอน แนวตั้ง และแนวทแยง

## 🧮 โครงสร้างโค้ด

### ไฟล์หลัก
- `index.html` - หน้าเว็บหลัก
- `game.js` - Logic เกมและ AI
- `style.css` - สไตล์และแอนิเมชัน

### ฟังก์ชันสำคัญ

#### Game Logic
- `createBoard()` - สร้างกระดานเปล่า
- `dropDisc(board, col, player)` - วางแผ่นในคอลัมน์
- `isValidMove(board, col)` - ตรวจสอบว่าเดินได้หรือไม่
- `getAvailableRow(board, col)` - หาแถวว่างล่างสุด
- `checkWin(board, player)` - ตรวจสอบการชนะ
- `checkDraw(board)` - ตรวจสอบเสมอ

#### AI Functions
- `minimax(board, depth, alpha, beta, maximizingPlayer, player)` - Minimax algorithm
- `evaluateBoard(board, player)` - ประเมินคะแนนกระดาน
- `getAIMove(board, difficulty)` - คำนวณการเดินของ AI

#### React Components
- `Game` - Component หลักของเกม
- `Board` - Component กระดาน
- `Cell` - Component ช่องเดียว

## 🧠 AI Algorithm

### Minimax with Alpha-Beta Pruning
AI ใช้ Minimax algorithm เพื่อหาการเดินที่ดีที่สุด:

1. **Minimax**: สำรวจทุกความเป็นไปได้และเลือกการเดินที่ดีที่สุด
2. **Alpha-Beta Pruning**: ตัดกิ่งที่ไม่จำเป็นเพื่อเพิ่มความเร็ว
3. **Evaluation Function**: ประเมินคะแนนกระดานตาม:
   - จำนวน 2-in-a-row, 3-in-a-row
   - การบล็อกฝ่ายตรงข้าม
   - ความชอบคอลัมน์กลาง

### ระดับความยาก
- **ง่าย**: เดินแบบสุ่ม
- **ปานกลาง**: Minimax depth 3 (มองไปข้างหน้า 3 ตา)
- **ยาก**: Minimax depth 5 (มองไปข้างหน้า 5 ตา)

## 📦 เทคโนโลยี

- **React 18** - UI Framework
- **Vanilla JavaScript** - Game Logic
- **CSS3** - Styling & Animations
- **HTML5** - Structure

## 🎨 การปรับแต่ง

### เปลี่ยนสี
แก้ไขใน `style.css`:
```css
.disc.player1 {
    background: radial-gradient(circle at 30% 30%, #ff6b6b, #d32f2f);
}

.disc.player2 {
    background: radial-gradient(circle at 30% 30%, #ffd93d, #f57f17);
}
```

### ปรับขนาดกระดาน
แก้ไขใน `game.js`:
```javascript
const ROWS = 6;
const COLS = 7;
```

### ปรับความยาก AI
แก้ไข depth ใน `getAIMove()`:
```javascript
// ยากขึ้น
return minimax(board, 7, -Infinity, Infinity, true, PLAYER2)[0];
```

## 🐛 การแก้ปัญหา

### เกมช้า
- ลด depth ของ Minimax
- ใช้ระดับความยากต่ำกว่า

### แอนิเมชันกระตุก
- ตรวจสอบ browser performance
- ลด CSS animations

## 📝 License

MIT License - ใช้งานได้อย่างอิสระ

## 👨‍💻 ผู้พัฒนา

สร้างด้วย ❤️ โดย Kiro AI

---

สนุกกับการเล่น! 🎉
