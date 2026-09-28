import { SYMBOL_LEAVES } from '@/components/GanjiSymbol';
import { stepped } from './HeroOnde';

/** Une fois par session : le script marque la page avant son premier affichage, le rideau n'est plus joué. */
const ONCE = "try{if(sessionStorage.getItem('ganji-intro'))document.documentElement.classList.add('intro-vue');else sessionStorage.setItem('ganji-intro','1')}catch(e){}";

/** L'onde de la charte : carrés en escalier pleins, du Vert Ganji à la Forêt du hero (brand-900), dans l'ordre de sortie. */
const WAVES = ['#168a56', '#157549', '#12603f', '#0f4b35', '#0b3d2c'];

/**
 * Chargement (≈ 3,4 s, une fois par session). Sur fond Papier, les quatre feuilles du symbole arrivent une à une
 * des coins de l'écran et se posent : on voit le logo se construire. Puis l'onde de la charte sort du symbole en
 * carrés en escalier pleins, du Vert Ganji à la Forêt, jusqu'à couvrir l'écran ; le rideau, devenu de la couleur
 * du hero, s'efface sur lui. CSS seul ; retiré en « mouvement réduit ».
 */
export function Intro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ONCE }} />
      <div aria-hidden className="intro fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-[#f5f4ee]">
        <span className="relative grid h-36 w-36 place-items-center sm:h-44 sm:w-44">
          <svg viewBox="-100 -100 200 200" className="absolute inset-0 h-full w-full overflow-visible">
            {WAVES.map((fill, i) => (
              <path key={fill} d={stepped(40)} fill={fill} className="intro-wave" style={{ '--w': i } as React.CSSProperties} />
            ))}
          </svg>
          <span className="intro-stage relative grid h-[80%] w-[80%] place-items-center">
            <svg viewBox="0 0 520 520" className="intro-mark h-full w-full overflow-visible">
              {SYMBOL_LEAVES.map((d, i) => (
                <path key={`g${i}`} d={d} fill="#5FD08F" className={`intro-ghost leaf-${i}`} />
              ))}
              {SYMBOL_LEAVES.map((d, i) => (
                <path key={i} d={d} fill="#168A56" className={`intro-leaf leaf-${i}`} />
              ))}
            </svg>
          </span>
        </span>
      </div>
    </>
  );
}
