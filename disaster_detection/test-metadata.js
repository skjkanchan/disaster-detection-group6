(async () => {
  try {
    const res = await fetch("http://localhost:3000/api/matthew-metadata");
    const json = await res.json();
    console.log("metadataList length:", json.length);
    console.log("metadataList is array:", Array.isArray(json));
    console.log("first item:", json[0]?.id);
  } catch (e) {
    console.error(e);
  }
})();
