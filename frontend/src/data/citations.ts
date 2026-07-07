import type { Citation } from '@fasl-work/caos-app-shell';

// The references FragmentIQ's methodology rests on, fragmentation PSD + image-based delineation.
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
  {
    id: 'otsu1979',
    label: 'Otsu 1979',
    citation: 'Otsu, N. (1979). A threshold selection method from gray-level histograms. IEEE Transactions on Systems, Man, and Cybernetics, 9(1), 62-66.',
    doi: '10.1109/TSMC.1979.4310076',
  },
  {
    id: 'serra1982',
    label: 'Serra 1982',
    citation: 'Serra, J. (1982). Image Analysis and Mathematical Morphology. Academic Press. (Granulometries, opening-by-size pattern spectra; after Matheron 1975, Random Sets and Integral Geometry.)',
  },
  {
    id: 'yaghoobi2018',
    label: 'Yaghoobi 2018 (dataset)',
    citation: 'Yaghoobi, H. (2018). fragmented rocks by blasting. Mendeley Data, V1. 226 post-blast rock-fragment photographs from the Gole-Gohar iron ore mine, Iran. Licensed CC BY 4.0.',
    doi: '10.17632/z78ghz96bn.1',
  },
  {
    id: 'zhao2024',
    label: 'Zhao et al. 2024',
    citation: 'Zhao, J., Li, D. & Yu, Y. (2024). Identification of Rock Fragments after Blasting by Using Deep Learning-Based Segment Anything Model. Minerals, 14(7), 654.',
    doi: '10.3390/min14070654',
  },
  {
    id: 'kirillov2023',
    label: 'Kirillov et al. 2023',
    citation: 'Kirillov, A., Mintun, E., Ravi, N., et al. (2023). Segment Anything. In Proc. IEEE/CVF ICCV, 4015-4026. arXiv:2304.02643.',
  },
  {
    id: 'ronneberger2015',
    label: 'Ronneberger et al. 2015',
    citation: 'Ronneberger, O., Fischer, P. & Brox, T. (2015). U-Net: Convolutional Networks for Biomedical Image Segmentation. In MICCAI, LNCS 9351, 234-241.',
    doi: '10.1007/978-3-319-24574-4_28',
  },
];
