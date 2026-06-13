export const metadata = {
  title: 'Azeritek CRM',
  description: 'Panel de gestión comercial de Azeritek',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, background: '#0b0d12' }}>
        {children}
      </body>
    </html>
  )
}