if [ ! -d "./octopus-demo-app/src/androidTest/assets/test_resources/audio" ]
then
    echo "Creating test audio samples directory..."
    mkdir -p ./octopus-demo-app/src/androidTest/assets/test_resources/audio
fi

echo "Copying test audio samples..."
cp ../../../res/audio/multiple_keywords.wav ./octopus-demo-app/src/androidTest/assets/test_resources/audio/multiple_keywords.wav
