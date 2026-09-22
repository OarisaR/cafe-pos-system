// =========================================================================
// /dashboard/orders — role অনুযায়ী দুই রকম স্ক্রিন
//
//   Owner / Manager → OrdersRegister: সব অর্ডারের তথ্য (শুধু দেখা)
//                     কে নিয়েছে, কী, কখন, কোন টেবিলে, কত টাকা
//   Cashier / Staff → OrdersPage: অর্ডার নেওয়ার POS টার্মিনাল (Person 2)
//
// Owner চাইলে টেবিল থেকে অর্ডারও নিতে পারবেন — Tables পেজ থেকে টেবিলে
// চাপ দিলে /dashboard/orders/table/:tableNumber খোলে, সেটা সবার জন্যই POS।
// =========================================================================
import React from 'react'
import { useAuth } from '../authentication/context/AuthContext'
import { ROLES } from '../authentication/constants/rbac'
import { OrdersRegister } from './OrdersRegister'
import { OrdersPage } from './OrdersPage'

export const OrdersHome = () => {
  const { role } = useAuth()
  const isSupervisor = role === ROLES.OWNER || role === ROLES.MANAGER

  return isSupervisor ? <OrdersRegister /> : <OrdersPage />
}
