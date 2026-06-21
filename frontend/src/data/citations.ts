import type { Citation } from '@fasl-work/caos-app-shell';

// The references FragmentIQ's methodology rests on — fragmentation PSD + image-based delineation.
export const CITATIONS: Citation[] = [
  {
    id: 'rosin1933',
    label: 'Rosin & Rammler 1933',
    citation: 'Rosin, P. & Rammler, E. (1933). The laws governing the fineness of powdered coal. Journal of the Institute of Fuel, 7, 29–36.',
  },
  {
    id: 'cunningham1983',
    label: 'Cunningham 1983',
    citation: 'Cunningham, C. V. B. (1983). The Kuz-Ram model for prediction of fragmentation from blasting. In Proc. 1st Int. Symp. on Rock Fragmentation by Blasting, 439–453.',
  },
  {
    id: 'ouchterlony2005',
    label: 'Ouchterlony 2005',
    citation: 'Ouchterlony, F. (2005). The Swebrec© function: linking fragmentation by blasting and crushing. Mining Technology, 114(1), 29–44.',
    doi: '10.1179/037178405X44539',
  },
  {
    id: 'vincent1991',
    label: 'Vincent & Soille 1991',
    citation: 'Vincent, L. & Soille, P. (1991). Watersheds in digital spaces: an efficient algorithm based on immersion simulations. IEEE Trans. PAMI, 13(6), 583–598.',
    doi: '10.1109/34.87344',
  },
  {
    id: 'maerz1996',
    label: 'Maerz et al. 1996',
    citation: 'Maerz, N. H., Palangio, T. C. & Franklin, J. A. (1996). WipFrag image based granulometry system. In Proc. FRAGBLAST 5, 91–99.',
  },
  {
    id: 'sanchidrian2009',
    label: 'Sanchidrián et al. 2009',
    citation: 'Sanchidrián, J. A., Segarra, P., Ouchterlony, F. & López, L. M. (2009). On the accuracy of fragment size measurement by image analysis in combination with some distribution functions. Rock Mechanics and Rock Engineering, 42, 95–116.',
    doi: '10.1007/s00603-007-0161-8',
  },
];
