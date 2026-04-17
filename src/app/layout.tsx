import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocuFlow — Your Personal Reading Space',
  description:
    'Upload PDF and DOCX documents, read them in a beautiful blog-like interface, highlight text, and take personal notes.',
  keywords: ['document reader', 'PDF reader', 'DOCX reader', 'annotations', 'highlights'],
  openGraph: {
    title: 'DocuFlow',
    description: 'Your personal reading & annotation space',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
