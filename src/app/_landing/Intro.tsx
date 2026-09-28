import { SYMBOL_LEAVES } from '@/components/GanjiSymbol';
import { stepped } from './HeroOnde';

/** Une fois par session : le script marque la page avant son premier affichage, le rideau n'est plus joué. */
const ONCE = "try{if(sessionStorage.getItem('ganji-intro'))document.documentElement.classList.add('intro-vue');else sessionStorage.setItem('ganji-intro','1')}catch(e){}";

/** L'onde de la charte : carrés en escalier qui s'ouvrent depuis le symbole, du plus proche au plus loin. */
const WAVES = [44, 44, 44];

/**
 * Chargement (≈ 3,3 s, une fois par session). Sur le rideau Papier, les quatre feuilles du symbole arrivent
 * une à une des coins de l'écran, avec une traînée, et se posent, avec un léger rebond : on voit le logo se construire. Puis
 * l'onde de la charte (carrés en escalier, pas un cercle) s'ouvre depuis le symbole, et le rideau clair se
 * lève sur le hero Forêt. CSS seul ; retiré en « mouvement réduit ».
 */
export function Intro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ONCE }} />
      <div aria-hidden className="intro fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-[#f5f4ee] shadow-[0_24px_60px_-10px_rgb(0_0_0_/_0.45)]">
        <span className="intro-stage relative grid h-52 w-52 place-items-center sm:h-72 sm:w-72">
          <svg viewBox="-100 -100 200 200" className="absolute inset-0 h-full w-full overflow-visible">
            {WAVES.map((h, i) => (
              <path key={i} d={stepped(h)} fill="none" stroke="#168A56" strokeWidth={4} className="intro-wave" style={{ '--w': i } as React.CSSProperties} />
            ))}
          </svg>
          <svg viewBox="0 0 520 520" className="intro-mark relative h-[80%] w-[80%] overflow-visible">
            {SYMBOL_LEAVES.map((d, i) => (
              <path key={`g${i}`} d={d} fill="#5FD08F" className={`intro-ghost leaf-${i}`} />
            ))}
            {SYMBOL_LEAVES.map((d, i) => (
              <path key={i} d={d} fill="#168A56" className={`intro-leaf leaf-${i}`} />
            ))}
          </svg>
        </span>
      </div>
    </>
  );
}
