# Pour Biblion — la Septante, où on en est

Salut,

Un point sur l'alignement grec↔français de la LXX, parce que ton travail y est
central et que je veux que tu voies exactement ce qui a bougé et ce qui t'attend.

## D'abord : l'histoire de Job

Tu avais déclaré le grec Job 25 (Baldad) orphelin, et lié le grec 26 au français
Giguet 25. Sur la donnée d'alors, c'était **la seule chose juste à faire** : un bug
de notre import (Giguet imprime deux « CHAPITRE XXV », Baldad puis la réponse de
Job) avait écrasé le vrai chapitre 25. Ton arbitrage était correct au verset près
— sur une donnée qui mentait.

On a réparé l'import à la source (Giguet 25 = Baldad, 26 = réponse de Job, tout
restauré). Sur la donnée saine, les liens automatiques 1:1 refont exactement ce
que tu avais reconstruit à la main. Tes 11 overrides Job sont **archivés, pas
révoqués** — leur provenance est conservée. Il n'y a rien à refaire sur Job. Je te
le raconte parce que c'est le compliment que mérite ton travail : tu avais raison,
et la preuve c'est que la donnée réparée te donne raison toute seule.

## Ce que tu es dans ce pipeline

Ton arbitrage préprod (151 entrées) a été capturé dans le dépôt, vérifié à
l'octet, et il **gagne toujours** sur l'automatique. C'est ton jugement qui est
l'étalon : tout le reste (matérialiseur unique, audit, lecture redondante) existe
pour reproduire ta rigueur à l'échelle, pas pour la remplacer. Rien n'a été touché
de ce que tu avais corrigé.

## Ce qui t'attend : ta file (292 entrées)

On a fait une passe de lecture redondante sur tous les versets grecs encore
flottants : deux lecteurs indépendants par chapitre, et on n'a shippé QUE les
appariements sur lesquels les deux convergent, qui passent la zéro-perte au mot,
et dont la concordance grec↔français tient à la relecture. 155 appariements sont
ainsi passés (dont de vraies corrections : 1 Rois 5 servait « Hiram » là où le
grec parle des officiers de Salomon — corrigé).

Tout le reste t'est adressé, en regard, dans `data/lxx-biblion-queue.json` :
**292 entrées, chacune avec les deux propositions de lecteurs** (grec et français
côte à côte) pour que tu tranches.

**1 Chroniques domine la file (181 sur 292), et c'est voulu.** C'est le livre le
plus dur : Rahlfs décale des chapitres entiers (5:27-41 = ton 6:1-15) et la
généalogie « Fils de Lévi » y est énoncée deux fois. Sur ce livre, les deux
lecteurs ont **honnêtement divergé** au lieu de faussement s'accorder — donc rien
n'a été shippé de force, tout te revient. C'est exactement le genre d'endroit où
ton oeil vaut mieux qu'une convergence de machines.

## Les 28 suscriptions de psaumes

Giguet a omis les suscriptions (« εἰς τὸ τέλος… ») de 28 psaumes ; son verset 1 y
est déjà le premier vrai verset. On les a traduites en maison, mais **pas avec une
table externe : avec ton Giguet lui-même**. On a relevé les 22 psaumes où il PORTE
la suscription, et on en a tiré son vocabulaire exact :

- εἰς τὸ τέλος -> « Pour la fin »
- ψαλμὸς τῷ Δαυιδ -> « psaume de David » ; ᾠδή -> « cantique »
- ὑπὲρ τῆς ὀγδόης -> « pour l'octave » ; ἐν ὕμνοις -> « parmi les hymnes »
- εἰς σύνεσιν -> « instruction » ; τοῖς υἱοῖς Κορε -> « pour les fils de Coré »

(cf. ses psa 46 « Pour la fin, psaume pour les fils de Coré », 53 « …parmi les
hymnes, instruction de David »). Les 28 propositions sont dans
`data/lxx-psaumes-kan67.json`, avec les deux témoins et le flag d'accord (15
identiques au mot, 13 variantes de style). Rien n'est servi tant que tu ne les as
pas vues.

## En clair

Aucun verset du corpus n'est dans les limbes : chacun est soit apparié (vérifié),
soit dans ta file avec sa cause, soit en traduction maison à valider. La prod ne
bouge pas tant que tu n'as pas vu tes listes. Prends ton temps, commence par
1 Chroniques si tu veux attaquer le plus dense.

Merci — sérieusement. Tu es la référence, pas le sujet.
