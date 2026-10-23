/**
 * Static sample QR code from the design (29×29 modules). The real code is
 * issued per customer by the API (`GET /me/qr`) and only lives in the app.
 */
const QR_PATH =
  "M0 0h7v1h-7zM8 0h3v1h-3zM13 0h3v1h-3zM19 0h2v1h-2zM22 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM9 1h1v1h-1zM11 1h3v1h-3zM15 1h1v1h-1zM18 1h1v1h-1zM20 1h1v1h-1zM22 1h1v1h-1zM28 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h1v1h-1zM10 2h1v1h-1zM13 2h8v1h-8zM22 2h1v1h-1zM24 2h3v1h-3zM28 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h1v1h-1zM15 3h2v1h-2zM19 3h1v1h-1zM22 3h1v1h-1zM24 3h3v1h-3zM28 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM11 4h1v1h-1zM14 4h1v1h-1zM22 4h1v1h-1zM24 4h3v1h-3zM28 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM10 5h1v1h-1zM12 5h1v1h-1zM14 5h1v1h-1zM17 5h3v1h-3zM22 5h1v1h-1zM28 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h1v1h-1zM20 6h1v1h-1zM22 6h7v1h-7zM8 7h3v1h-3zM14 7h1v1h-1zM16 7h5v1h-5zM1 8h1v1h-1zM3 8h1v1h-1zM5 8h4v1h-4zM10 8h2v1h-2zM15 8h1v1h-1zM18 8h1v1h-1zM20 8h4v1h-4zM25 8h2v1h-2zM28 8h1v1h-1zM2 9h2v1h-2zM5 9h1v1h-1zM11 9h1v1h-1zM14 9h2v1h-2zM17 9h2v1h-2zM22 9h2v1h-2zM27 9h2v1h-2zM0 10h1v1h-1zM2 10h2v1h-2zM6 10h2v1h-2zM10 10h1v1h-1zM12 10h1v1h-1zM15 10h1v1h-1zM17 10h3v1h-3zM21 10h2v1h-2zM25 10h3v1h-3zM2 11h1v1h-1zM5 11h1v1h-1zM10 11h1v1h-1zM12 11h1v1h-1zM16 11h1v1h-1zM18 11h9v1h-9zM28 11h1v1h-1zM1 12h2v1h-2zM6 12h3v1h-3zM12 12h2v1h-2zM15 12h3v1h-3zM19 12h1v1h-1zM21 12h2v1h-2zM25 12h1v1h-1zM27 12h2v1h-2zM2 13h1v1h-1zM4 13h2v1h-2zM7 13h2v1h-2zM12 13h2v1h-2zM15 13h3v1h-3zM19 13h1v1h-1zM23 13h1v1h-1zM25 13h1v1h-1zM1 14h3v1h-3zM6 14h2v1h-2zM10 14h1v1h-1zM13 14h1v1h-1zM15 14h4v1h-4zM22 14h2v1h-2zM28 14h1v1h-1zM0 15h1v1h-1zM3 15h3v1h-3zM7 15h1v1h-1zM11 15h1v1h-1zM13 15h2v1h-2zM17 15h2v1h-2zM20 15h1v1h-1zM23 15h1v1h-1zM25 15h1v1h-1zM2 16h2v1h-2zM6 16h2v1h-2zM10 16h1v1h-1zM12 16h2v1h-2zM17 16h2v1h-2zM25 16h1v1h-1zM27 16h1v1h-1zM3 17h2v1h-2zM8 17h1v1h-1zM12 17h1v1h-1zM14 17h2v1h-2zM18 17h1v1h-1zM20 17h1v1h-1zM22 17h1v1h-1zM25 17h4v1h-4zM0 18h1v1h-1zM2 18h2v1h-2zM5 18h3v1h-3zM9 18h1v1h-1zM11 18h2v1h-2zM14 18h1v1h-1zM16 18h1v1h-1zM18 18h1v1h-1zM20 18h3v1h-3zM24 18h5v1h-5zM2 19h1v1h-1zM4 19h1v1h-1zM7 19h2v1h-2zM15 19h5v1h-5zM21 19h1v1h-1zM23 19h3v1h-3zM27 19h2v1h-2zM0 20h1v1h-1zM2 20h1v1h-1zM5 20h4v1h-4zM10 20h1v1h-1zM12 20h2v1h-2zM18 20h1v1h-1zM20 20h5v1h-5zM26 20h1v1h-1zM28 20h1v1h-1zM8 21h3v1h-3zM12 21h1v1h-1zM17 21h4v1h-4zM24 21h1v1h-1zM26 21h3v1h-3zM0 22h7v1h-7zM8 22h2v1h-2zM12 22h3v1h-3zM16 22h3v1h-3zM20 22h1v1h-1zM22 22h1v1h-1zM24 22h2v1h-2zM27 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM8 23h7v1h-7zM19 23h2v1h-2zM24 23h1v1h-1zM26 23h3v1h-3zM0 24h1v1h-1zM2 24h3v1h-3zM6 24h1v1h-1zM9 24h2v1h-2zM17 24h2v1h-2zM20 24h6v1h-6zM28 24h1v1h-1zM0 25h1v1h-1zM2 25h3v1h-3zM6 25h1v1h-1zM8 25h1v1h-1zM12 25h2v1h-2zM16 25h1v1h-1zM18 25h2v1h-2zM21 25h2v1h-2zM24 25h1v1h-1zM27 25h1v1h-1zM0 26h1v1h-1zM2 26h3v1h-3zM6 26h1v1h-1zM10 26h3v1h-3zM16 26h3v1h-3zM21 26h1v1h-1zM24 26h1v1h-1zM26 26h1v1h-1zM28 26h1v1h-1zM0 27h1v1h-1zM6 27h1v1h-1zM8 27h1v1h-1zM13 27h1v1h-1zM15 27h1v1h-1zM17 27h2v1h-2zM20 27h1v1h-1zM25 27h1v1h-1zM27 27h1v1h-1zM0 28h7v1h-7zM10 28h3v1h-3zM17 28h1v1h-1zM19 28h4v1h-4zM24 28h1v1h-1zM27 28h1v1h-1z";

export function SampleQrCode({ label, size = 208 }: { label: string; size?: number }) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 29 29"
      width={size}
      height={size}
      shapeRendering="crispEdges"
    >
      <rect width="29" height="29" fill="#ffffff" />
      <path fill="#2a2418" d={QR_PATH} />
    </svg>
  );
}
