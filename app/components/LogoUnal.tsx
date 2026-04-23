import Image from 'next/image'

export function LogoUnal({ height = 40 }: { height?: number }) {
  // Logo is 7811×3321 (wide horizontal format) — keep aspect ratio
  const width = Math.round(height * (7811 / 3321))

  return (
    <Image
      src="/logo-unal.png"
      alt="Universidad Nacional de Colombia"
      width={width}
      height={height}
      priority
    />
  )
}
