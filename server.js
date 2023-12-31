import "./db.js";
import express from "express";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import session from "express-session";
import MongoStore from "connect-mongo";

const app = express();
const PORT = 8080;
const __dirname = path.resolve();

app.use(express.json());

app.listen(PORT, function () {
  console.log(`listening on ${PORT}`);
});

//세션에 id저장
app.use(
  session({
    secret: process.env.COOKIE_SECRET, // 세션을 암호화하기 위한 키. 실제 개발에선 보안을 위해 .env 파일 등에 저장하는 것이 좋습니다.
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.DB_URL }),
  })
);

//로그인
app.post("/login", async (req, res) => {
  const { id, password } = req.body;

  const user = await User.findOne({ id });
  const ok = await bcrypt.compare(password, user.password);
  if (!user || !ok) {
    return res.status(401).send("아이디 또는 비밀번호가 잘못되었습니다.");
  }

  // res.cookie("session_id", sessionID, { httpOnly: true });
  req.session.user = user;
  return res.status(200).send("로그인 성공");
});

//쿠키 확인
// app.get("/schedules", async (req, res) => {
//   // 쿠키를 통해 사용자 식별
//   const sessionID = req.cookies["session_id"];
//   const user = findUserBySessionID(sessionID);

//   // 사용자의 일정 데이터를 가져옵니다.
//   const schedules = await getScheduleData(user.id);
//   res.json(schedules);
// });

//로그아웃
app.post("/logout", (req, res) => {
  // 쿠키를 삭제합니다.
  // res.clearCookie("session_id");

  // 로그아웃 성공 메시지를 클라이언트에게 전송합니다.
  req.session.destroy();
  res.status(200).send("로그아웃 성공");
});

// 회원가입
const userSchema = new mongoose.Schema({
  id: { type: String, require: true, unique: true },
  name: { type: String, require: true },
  password: { type: String, require: true },
});

userSchema.pre("save", async function () {
  this.password = await bcrypt.hash(this.password, 5);
});

const User = mongoose.model("User", userSchema);

app.post("/signup", async (req, res) => {
  const { id, name, password } = req.body;

  const user = await User.findOne({ id: id });
  if (user) {
    return res.status(409).send("이미 존재하는 아이디입니다.");
  }

  const newUser = new User({ id, name, password });
  await newUser.save();

  res.status(200).send("회원 가입이 완료되었습니다.");
});

const scheduleSchema = new mongoose.Schema({
  title: { type: String, require: true },
  description: { type: String, require: true },
  color: { type: String, require: true },
  startDate: { type: Date, require: true },
  endDate: { type: Date, require: true },
});

const Schedule = mongoose.model("Schedule", scheduleSchema);

//블록 저장
app.post("/schedules", async (req, res) => {
  const { title, description, color, startDate, endDate } = req.body;

  const schedule = new Schedule({
    title,
    description,
    color,
    startDate,
    endDate,
  });
  await schedule.save();

  try {
    const savedSchedule = await schedule.save();
    res.json({ schedule: savedSchedule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

//빌드
app.use(express.static(path.join(__dirname, "tomorrow-app/build")));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "/tomorrow-app/build/index.html"));
});

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "/tomorrow-app/build/index.html"));
});
