import React from 'react'
import { AppRouter } from './routes/AppRouter'

/**
 * পুরো অ্যাপের entry। আগে এখানে ভুল করে একটা ডেমো admin user বসানো ছিল,
 * তাই run করলেই সরাসরি admin dashboard খুলে যেত।
 * এখন সব কিছু AppRouter এর ভিতর — আর প্রতিটা পেজ auth guard এর পিছনে।
 */
export default function App() {
  return <AppRouter />
}
