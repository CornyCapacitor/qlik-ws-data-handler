import os from 'os';

const getLocalIP = (): string => {
  const interfaces = os.networkInterfaces();

  for (const name in interfaces) {
    const addrs = interfaces[name];
    if (!addrs) continue; // <-- jeśli undefined, pomijamy

    for (const iface of addrs) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}

export const appListen = (PORT: number) => {
  const ip = getLocalIP()

  console.log(`Server's running at http://${ip}:${PORT}`)
}