import logoSrc from '../../assets/logo.png'

interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 64, className = '' }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Applaude"
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
