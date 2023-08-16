if [ ! -d "./octopus-test-app/src/androidTest/assets/test_resources/audio" ]
then
    echo "Creating test audio samples directory..."
    mkdir -p ./octopus-test-app/src/androidTest/assets/test_resources/audio
fi

echo "Copying test audio samples..."
cp ../../../res/audio/multiple_keywords*.wav ./octopus-test-app/src/androidTest/assets/test_resources/audio/

if [ ! -d "./octopus-test-app/src/androidTest/assets/test_resources/param" ]
then
    echo "Creating octopus params directory..."
    mkdir -p ./octopus-test-app/src/androidTest/assets/test_resources/param
fi

echo "Copying octopus params files..."
cp ../../../lib/common/param/octopus_params*.pv ./octopus-test-app/src/androidTest/assets/test_resources/param/
