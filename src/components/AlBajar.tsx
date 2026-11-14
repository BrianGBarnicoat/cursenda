import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Lo que va dentro aparece suave al llegar a él bajando por la página.
// Como dice MOTION.md: solo en ordenador, sin rebote, y nada si se ha pedido menos movimiento.

type Etiqueta = 'div' | 'li' | 'header';

type Props = {
  children: ReactNode;
  como?: Etiqueta;
  className?: string;
  /** Segundos de espera, para que varias cosas entren una detrás de otra. */
  retraso?: number;
};

const ANCHO = '(min-width: 701px)';

function useEsOrdenador() {
  const [es, setEs] = useState(() => window.matchMedia(ANCHO).matches);
  useEffect(() => {
    const consulta = window.matchMedia(ANCHO);
    const alCambiar = () => setEs(consulta.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);
  return es;
}

export default function AlBajar({ children, como = 'div', className, retraso = 0 }: Props) {
  const quieto = useReducedMotion();
  const ordenador = useEsOrdenador();

  if (quieto || !ordenador) {
    const Fija = como;
    return <Fija className={className}>{children}</Fija>;
  }

  const Movil = motion[como] as typeof motion.div;
  return (
    <Movil
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.4, delay: retraso, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Movil>
  );
}
