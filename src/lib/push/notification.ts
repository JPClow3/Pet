export function safePushNotification(raw: unknown) {
  const value =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  return {
    title: "Zelupi",
    options: {
      body: "Confira sua agenda de cuidados. O aviso não confirma nenhuma dose.",
      icon: "/icons/zelupi-192.png",
      badge: "/icons/zelupi-badge.png",
      tag:
        typeof value.tag === "string" && /^[a-f0-9]{32}$/.test(value.tag)
          ? `pethub-${value.tag}`
          : "pethub-care",
      renotify: false,
      data: { url: "/reminders" },
    },
  };
}
export function safePushClickUrl(origin: string) {
  return new URL("/reminders", origin).href;
}
