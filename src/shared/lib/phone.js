// =========================================================================
// বাংলাদেশি মোবাইল নম্বর — একটাই নিয়ম, পুরো সিস্টেমের জন্য
//
// গঠন:  +880  01XXXXXXXXX
//             └─ ০১ দিয়ে শুরু, মোট ১১ অঙ্ক
//
// দেখানোর চেহারা:  +880 01712 345678
//
// ⚠️ দ্রষ্টব্য: আন্তর্জাতিক নিয়মে +880 এর পরে শুরুর ০ টা বাদ যায়
//    (+880 1712-345678)। কিন্তু এই সিস্টেমে ০ সহ ১১ অঙ্কই দেখানো হয় —
//    দেশের ভিতরে সবাই এভাবেই নম্বর লেখে ও পড়ে। চাইলে নিচের
//    formatBdPhone এ একটা লাইন বদলালেই আন্তর্জাতিক চেহারা পাওয়া যাবে।
// =========================================================================

export const BD_DIAL_CODE = '+880'

/** নতুন ফর্ম খুললে ঘরে যা বসানো থাকবে */
export const BD_PHONE_DEFAULT = `${BD_DIAL_CODE} 01`

/** ইনপুটের placeholder */
export const BD_PHONE_PLACEHOLDER = `${BD_DIAL_CODE} 01712 345678`

/** ইনপুটের নিচে ছোট করে যা লেখা থাকবে */
export const BD_PHONE_HINT = '11 digits starting with 01 — for example 01712 345678'

/** ভুল হলে যে বার্তাটা দেখানো হবে */
export const BD_PHONE_ERROR =
  'Enter a valid Bangladeshi mobile number: 11 digits starting with 01, like +880 01712 345678.'

/**
 * যেকোনো লেখা থেকে শুধু স্থানীয় ১১ অঙ্ক বের করে আনে।
 * এটাই সব যাচাই ও সেভ করার ভিত্তি।
 *
 *   "+880 01712 345678"  → "01712345678"
 *   "+8801712345678"     → "01712345678"   (880 বাদ, ০ বসানো)
 *   "8801712345678"      → "01712345678"
 *   "1712345678"         → "01712345678"   (শুরুর ০ বসানো)
 *   "017-1234 5678"      → "01712345678"
 */
export const bdLocalDigits = (value) => {
  let digits = String(value || '').replace(/\D/g, '')

  // দেশের কোড লেখা থাকলে সেটা বাদ (00880 বা 880 — দুটোই)
  if (digits.startsWith('00880')) digits = digits.slice(5)
  else if (digits.startsWith('880')) digits = digits.slice(3)

  // কেউ শুরুর ০ ছাড়া লিখলে (আন্তর্জাতিক অভ্যাস) সেটা বসিয়ে দেওয়া হয়।
  // শর্তটা কড়া রাখা হয়েছে — ঠিক ১০ অঙ্ক আর ১ দিয়ে শুরু হলেই কেবল।
  // নাহলে "11712345678" এর মতো ভুল নম্বরেও ০ বসে, তারপর শেষ অঙ্কটা কেটে
  // গিয়ে সেটা চুপচাপ "বৈধ" হয়ে যেত।
  if (digits.length === 10 && digits.startsWith('1')) digits = `0${digits}`

  return digits.slice(0, 11)
}

/** ঠিক ১১ অঙ্ক, আর ০১ দিয়ে শুরু */
export const isValidBdPhone = (value) => /^01\d{9}$/.test(bdLocalDigits(value))

/**
 * টাইপ করার সাথে সাথে ঘরের লেখা সাজানো।
 * ঘরটা কখনো খালি হয় না — `+880 ` সবসময় থাকে, তাই ব্যবহারকারী
 * ভুল করে দেশের কোড মুছে ফেলতে পারেন না।
 */
export const formatBdPhone = (value) => {
  const digits = bdLocalDigits(value)
  if (!digits) return `${BD_DIAL_CODE} `

  // 01712 345678 — ৫ + ৬ অঙ্কে ভাগ করলে পড়তে সুবিধা
  const head = digits.slice(0, 5)
  const tail = digits.slice(5)
  return tail ? `${BD_DIAL_CODE} ${head} ${tail}` : `${BD_DIAL_CODE} ${head}`
}

/** ডেটাবেজে যে চেহারায় সেভ হবে (দেখানোর চেহারাটাই) */
export const normalizeBdPhone = (value) => formatBdPhone(value)

/** আর কয়টা অঙ্ক বাকি — ঘরের নিচে ছোট করে দেখানোর জন্য */
export const bdDigitsLeft = (value) => Math.max(0, 11 - bdLocalDigits(value).length)
