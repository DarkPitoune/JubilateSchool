import { useEffect } from "react";
import { supabase } from "../lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushSubscription(userId: string | undefined) {
  useEffect(() => {
    if (!userId || !VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) return; // already subscribed

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });

        const key = subscription.getKey("p256dh");
        const auth = subscription.getKey("auth");
        if (!key || !auth) return;

        const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
        const authStr = btoa(String.fromCharCode(...new Uint8Array(auth)));

        await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh,
            auth: authStr,
          },
          { onConflict: "endpoint" }
        );
      } catch (err) {
        console.warn("Push subscription failed:", err);
      }
    })();
  }, [userId]);
}
