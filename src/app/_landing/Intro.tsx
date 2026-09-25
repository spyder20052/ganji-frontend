import { SYMBOL_LEAVES } from '@/components/GanjiSymbol';

/** Une fois par session : le script marque la page avant son premier affichage, le rideau n'est plus joué. */
const ONCE = "try{if(sessionStorage.getItem('ganji-intro'))document.documentElement.classList.add('intro-vue');else sessionStorage.setItem('ganji-intro','1')}catch(e){}";

/**
 * Chargement : rideau Forêt, les quatre feuilles du symbole arrivent des coins et s'assemblent, une onde
 * part, puis le rideau se lève sur la page (≈ 1,2 s). CSS seul ; retiré en « mouvement réduit ».
 */
export function Intro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ONCE }} />
      <div aria-hidden className="intro fixed inset-0 z-[60] grid place-items-center bg-brand-900">
        <span className="intro-ring absolute h-28 w-28 rounded-full" />
        <svg viewBox="0 0 520 520" className="intro-mark h-24 w-24">
          {SYMBOL_LEAVES.map((d, i) => (
            <path key={i} d={d} fill="#5FD08F" className={`intro-leaf intro-leaf-${i}`} />
          ))}
        </svg>
      </div>
    </>
  );
}
