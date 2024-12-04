LIB_DIR="../../../lib"
RESOURCE_DIR="../../../res"
ASSETS_DIR="./OctopusAppTestUITests/test_resources"

echo "Creating test resources asset directory"
mkdir -p ${ASSETS_DIR}

echo "Copying test audio samples..."
mkdir -p ${ASSETS_DIR}/audio
cp ${RESOURCE_DIR}/audio/*.wav ${ASSETS_DIR}/audio

echo "Copying test model files..."
mkdir -p ${ASSETS_DIR}/model_files
cp ${LIB_DIR}/common/param/*.pv ${ASSETS_DIR}/model_files