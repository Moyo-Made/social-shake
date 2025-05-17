import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (

      <div
        className=""
      >
		<Navbar />
        {children}
		<Footer />
      </div>

  );
}
