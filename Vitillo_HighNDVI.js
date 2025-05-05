//Cargar aoi
var vitillo = ee.FeatureCollection("projects/bluemx/assets/Zona_restaurar_UMA_Vitillo_50ha")

Map.addLayer(vitillo,{color:'black'},'Vitillo')

//* Function to mask clouds using the Sentinel-2 QA band
// * @param {ee.Image} image Sentinel-2 image
// * @return {ee.Image} cloud masked Sentinel-2 image
// */

function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask);
}

// Cargar Sentinel 2 para la temporada de secas 2022
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate('2022-01-01', '2022-05-30')
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                  .map(maskS2clouds)
                  .select("B2","B3","B4","B8")
                  .filterBounds(vitillo);
print(s2,"s2")
var visualization = {
  bands: ['B4', 'B3', 'B2'],
  min: 300,
  max: 3000,
  gamma: 1.5
};

// Ordenar las imágenes por porcentaje de nubosidad (de menor a mayor)
var s2Sorted = s2.sort('CLOUDY_PIXEL_PERCENTAGE');

// Obtener la imagen con menos nubes (la primera en la colección ordenada)
var leastCloudyImage = ee.Image(s2Sorted.first());

// Recortar la imagen al área de interés
var clippedImage = leastCloudyImage.clip(vitillo);

// Visualizar la imagen
Map.addLayer(clippedImage, visualization, 'Imagen menos nubosa');

// Mostrar información de la imagen seleccionada
print('Imagen con menos nubosidad seleccionada:', leastCloudyImage);
print('Fecha de la imagen:', leastCloudyImage.date());
print('Porcentaje de nubosidad:', leastCloudyImage.get('CLOUDY_PIXEL_PERCENTAGE'));

//Calcular NDVI para la imagen seleccionada
var ndvi2022 = clippedImage.normalizedDifference(['B8','B4']).rename('NDVI_2022');

// Crear máscara para valores NDVI > 0.6
var ndviMask2022 = ndvi2022.gt(0.6); // gt = greater than

// Aplicar la máscara a la imagen original
var ndviFiltered2022 = ndvi2022.updateMask(ndviMask2022);

// Visualizar resultados
Map.addLayer(ndviFiltered2022.clip(vitillo), {
  min: 0.6,
  max: 1,
  palette: ['lightgreen', 'darkgreen']
}, 'NDVI 2022 > 0.6');

// Mostrar estadísticas de NDVI en el área
var ndviStats = ndvi2022.reduceRegion({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.stdDev(),
    sharedInputs: true
  }),
  geometry: vitillo,
  scale: 10,
  maxPixels: 1e9
});
print('Estadísticas de NDVI de 2022', ndviStats);

//Visualizar NDVI2022
Map.addLayer(ndvi2022,{
  min: 0,
  max: 1,
  palette: ['white', 'green']
},'NDVI 2022')

// Crear imagen binaria (1 para NDVI > 0.6, 0 para otros)
var ndviClass2022 = ndvi2022.gt(0.6).rename('NDVI_high');

// Calcular área con NDVI > 0.6
var areaStats2022 = ndviClass2022.multiply(ee.Image.pixelArea())
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: vitillo,
    scale: 10,
    maxPixels: 1e9
  });

print('Área con NDVI > 0.6 (m²) 2022:', areaStats2022.get('NDVI_high'));

// Convertir áreas a polígonos (para NDVI > 0.6)
var highNdviAreas2022 = ndviClass2022.reduceToVectors({
  geometry: vitillo,
  scale: 10,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'ndviClass',
  maxPixels: 1e9
}).filter(ee.Filter.eq('ndviClass', 1));

// Exportar solo estas áreas
Export.image.toDrive({
  image: ndviFiltered2022.clip(vitillo),
  description: 'NDVI2022_high_06',
  fileNamePrefix: 'NDVI2022_high_Vitillo',
  region: vitillo.geometry(),
  scale: 10,
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF'       // Formato de salida
});


// Cargar Sentinel 2 para la temporada de secas 2023
var s2_2023 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate('2023-01-01', '2023-05-30')
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                  .map(maskS2clouds)
                  .select("B2","B3","B4","B8")
                  .filterBounds(vitillo);

// Obtener la imagen con menos nubes 2023
var leastCloudy2023 = ee.Image(s2_2023.sort('CLOUDY_PIXEL_PERCENTAGE').first());

// Recortar la imagen al área de interés
var clipped2023 = leastCloudy2023.clip(vitillo);

// Mostrar información de la imagen seleccionada
print('Imagen con menos nubosidad seleccionada 2023:', leastCloudy2023);
print('Fecha de la imagen 2023:', leastCloudy2023.date());
print('Porcentaje de nubosidad 2023:', leastCloudy2023.get('CLOUDY_PIXEL_PERCENTAGE'));

//Calcular NDVI para la imagen seleccionada
var ndvi2023 = clipped2023.normalizedDifference(['B8','B4']).rename('NDVI_2023');

// Crear máscara para valores NDVI > 0.6
var ndviMask2023 = ndvi2023.gt(0.6); // gt = greater than

// Aplicar la máscara a la imagen original
var ndviFiltered2023 = ndvi2023.updateMask(ndviMask2022);

// Visualizar resultados
Map.addLayer(ndviFiltered2023.clip(vitillo), {
  min: 0.6,
  max: 1,
  palette: ['lightgreen', 'darkgreen']
}, 'NDVI 2023 > 0.6');

// Mostrar estadísticas de NDVI en el área
var ndviStats = ndvi2023.reduceRegion({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.stdDev(),
    sharedInputs: true
  }),
  geometry: vitillo,
  scale: 10,
  maxPixels: 1e9
});
print('Estadísticas de NDVI de 2023', ndviStats);

//Visualizar NDVI2023
Map.addLayer(ndvi2023,{
  min: 0,
  max: 1,
  palette: ['white', 'green']
},'NDVI 2023')

// Crear imagen binaria (1 para NDVI > 0.6, 0 para otros)
var ndviClass2023 = ndvi2023.gt(0.6).rename('NDVI_high');

// Calcular área con NDVI > 0.4
var areaStats2023 = ndviClass2023.multiply(ee.Image.pixelArea())
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: vitillo,
    scale: 10,
    maxPixels: 1e9
  });

print('Área con NDVI > 0.6 (m²) 2023:', areaStats2023.get('NDVI_high'));

// Convertir áreas a polígonos (para NDVI > 0.6)
var highNdviAreas2023 = ndviClass2023.reduceToVectors({
  geometry: vitillo,
  scale: 10,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'ndviClass',
  maxPixels: 1e9
}).filter(ee.Filter.eq('ndviClass', 1));

// Exportar solo estas áreas
Export.image.toDrive({
  image: ndviFiltered2023.clip(vitillo),
  description: 'NDVI2023_high_06',
  fileNamePrefix: 'NDVI2023_high_Vitillo',
  region: vitillo.geometry(),
  scale: 10,
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF'       // Formato de salida
});

// Cargar Sentinel 2 para la temporada de secas 2024
var s2_2024 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                  .filterDate('2024-01-01', '2024-05-30')
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                  .map(maskS2clouds)
                  .select("B2","B3","B4","B8")
                  .filterBounds(vitillo);

// Obtener la imagen con menos nubes 2023
var leastCloudy2024 = ee.Image(s2_2024.sort('CLOUDY_PIXEL_PERCENTAGE').first());

// Recortar la imagen al área de interés
var clipped2024 = leastCloudy2024.clip(vitillo);

// Mostrar información de la imagen seleccionada
print('Imagen con menos nubosidad seleccionada 2024:', leastCloudy2024);
print('Fecha de la imagen 2024:', leastCloudy2024.date());
print('Porcentaje de nubosidad 2024:', leastCloudy2024.get('CLOUDY_PIXEL_PERCENTAGE'));

//Calcular NDVI para la imagen seleccionada
var ndvi2024 = clipped2024.normalizedDifference(['B8','B4']).rename('NDVI_2024');
// Crear máscara para valores NDVI > 0.6
var ndviMask2024 = ndvi2024.gt(0.6); // gt = greater than

// Aplicar la máscara a la imagen original
var ndviFiltered2024 = ndvi2024.updateMask(ndviMask2024);

// Visualizar resultados
Map.addLayer(ndviFiltered2024.clip(vitillo), {
  min: 0.6,
  max: 1,
  palette: ['lightgreen', 'darkgreen']
}, 'NDVI 2024 > 0.6');
// Mostrar estadísticas de NDVI en el área 
var ndviStats = ndvi2024.reduceRegion({
  reducer: ee.Reducer.mean().combine({
    reducer2: ee.Reducer.stdDev(),
    sharedInputs: true
  }),
  geometry: vitillo,
  scale: 10,
  maxPixels: 1e9
});
print('Estadísticas de NDVI de 2024', ndviStats);

//Visualizar NDVI2024
Map.addLayer(ndvi2024,{
  min: 0,
  max: 1,
  palette: ['white', 'green']
},'NDVI 2024')

// Crear imagen binaria (1 para NDVI > 0.6, 0 para otros)
var ndviClass2024 = ndvi2024.gt(0.6).rename('NDVI_high');

// Calcular área con NDVI > 0.4
var areaStats2024 = ndviClass2024.multiply(ee.Image.pixelArea())
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: vitillo,
    scale: 10,
    maxPixels: 1e9
  });

print('Área con NDVI > 0.6 (m²) 2024:', areaStats2024.get('NDVI_high'));

// Exportar solo estas áreas
Export.image.toDrive({
  image: ndviFiltered2024.clip(vitillo),
  description: 'NDVI2024_high_06',
  fileNamePrefix: 'NDVI2024_high_Vitillo',
  region: vitillo.geometry(),
  scale: 10,
  maxPixels: 1e10,
  fileFormat: 'GeoTIFF'       // Formato de salida
});