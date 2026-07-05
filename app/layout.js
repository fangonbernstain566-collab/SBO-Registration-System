export const metadata = {
  title: 'SBO Event Registration',
  description: 'Student registration for SBO events',
}
import './global.css'
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}