// =========================================================================
// MODULE OWNER: Person 1 — Auth, Roles & Reporting
// Route: /dashboard   →  "Overview & Reports"  (Owner ও Manager দেখতে পায়)
//
// Owner লগইন করলে সবার আগে এই পেজটাই আসে।
// পুরো পেজটাই এখন ব্যবসার রিপোর্ট — আয়, লাভ, বিক্রি, লেনদেন,
// progression graph আর PDF ডাউনলোড। সব কাজ ReportsPanel এ।
//
// (কে কোন role, আর কোন module খোলা — সেটা বাঁ পাশের sidebar আর
//  উপরের topbar এই দেখা যায়, তাই এখানে আলাদা করে দেখানোর দরকার নেই।)
// =========================================================================
import React from 'react'
import { ReportsPanel } from '../reports/ReportsPanel'

export const OverviewPage = () => (
  // maxWidth নেই — চওড়া মনিটরে ডান পাশ ফাঁকা পড়ে থাকবে না
  <div style={styles.wrap}>
    <ReportsPanel />
  </div>
)

const styles = {
  wrap: {
    width: '100%',
    minWidth: 0,
  },
}
