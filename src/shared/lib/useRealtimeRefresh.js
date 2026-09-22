// =========================================================================
// ডেটাবেজে কিছু বদলালে সাথে সাথেই পর্দা হালনাগাদ করার hook
//
// Supabase Realtime ব্যবহার করে — kitchen এ কেউ "Ready" চাপলে cashier এর
// পর্দা নিজে থেকেই বদলে যায়, কাউকে refresh চাপতে হয় না।
//
// টেবিলগুলো realtime publication এ যোগ করা আছে (supabase_pos_schema.sql,
// ধাপ ১০): restaurant_tables, orders, order_items.
//
// ব্যবহার:
//   useRealtimeRefresh('kitchen-board', ['order_items', 'orders'], load)
//
// • অল্প সময়ের মধ্যে অনেকগুলো পরিবর্তন এলে একবারই ডাকা হয় (debounce),
//   নাহলে একসাথে ৫টা আইটেম পাঠালে ৫ বার লোড হতো।
// • সংযোগ কেটে গেলে (ল্যাপটপ ঘুমিয়ে গেলে, wifi গেলে) ফিরে আসার সময়
//   একবার হালনাগাদ করে নেয়, যাতে মাঝের পরিবর্তনগুলো বাদ না পড়ে।
// =========================================================================
import { useEffect, useRef } from 'react'
import { supabase } from './supabase'

export const useRealtimeRefresh = (channelName, tables, onChange, { debounceMs = 250 } = {}) => {
  // callback টা ref এ রাখা হয়, যাতে প্রতি render এ নতুন channel না বানাতে হয়
  const handlerRef = useRef(onChange)
  handlerRef.current = onChange

  const tableKey = tables.join(',')

  useEffect(() => {
    let timer = null
    let cancelled = false

    const fire = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (!cancelled) handlerRef.current?.()
      }, debounceMs)
    }

    const channel = supabase.channel(channelName)

    for (const table of tableKey.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire)
    }

    channel.subscribe()

    // ট্যাবে ফিরে এলে একবার মিলিয়ে নেওয়া (ঘুমিয়ে থাকা অবস্থার পরিবর্তন)
    const onVisible = () => {
      if (document.visibilityState === 'visible') fire()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(channel)
    }
  }, [channelName, tableKey, debounceMs])
}
