import { SYMBOL_LEAVES } from '@/components/GanjiSymbol';

/** Une fois par session : le script marque la page avant son premier affichage, le rideau n'est plus joué. */
const ONCE = "try{if(sessionStorage.getItem('ganji-intro'))document.documentElement.classList.add('intro-vue');else sessionStorage.setItem('ganji-intro','1')}catch(e){}";

/**
 * Chargement : rideau Papier (clair, pour trancher avec le hero Forêt), les quatre feuilles du symbole en
 * Vert Ganji arrivent des coins et s'assemblent, le symbole bat, une onde part, puis le rideau se lève sur le
 * hero sombre (≈ 2,7 s, une fois par session). CSS seul ; retiré en « mouvement réduit ».
 */
export function Intro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ONCE }} />
      <div aria-hidden className="intro fixed inset-0 z-[60] grid place-items-center bg-[#f5f4ee] shadow-[0_24px_60px_-10px_rgb(0_0_0_/_0.45)]">
        <span className="intro-ring absolute h-28 w-28 rounded-full" />
        <svg viewBox="0 0 520 520" className="intro-mark h-24 w-24 overflow-visible">
          {SYMBOL_LEAVES.map((d, i) => (
            <path key={i} d={d} fill="#168A56" className={`intro-leaf intro-leaf-${i}`} />
          ))}
        </svg>
      </div>
    </>
  );
}
