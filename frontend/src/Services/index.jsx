const images = require.context("../assets/images", true);
export  const dynamicImage = (image) => {
  try {
    return images(`./${image}`);
  } catch (e) {
    console.error(`Image ${image} not found.`);
    return ""; // ou retourner une image par défaut
  }
};