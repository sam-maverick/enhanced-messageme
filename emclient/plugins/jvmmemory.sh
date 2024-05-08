echo "Increase JVM metaspace from 512m to 2048m"
sed -r 's/org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m/echo -n "org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=2048m"/ge' ./android/gradle.properties > ./android/gradle.properties.tmp
mv ./android/gradle.properties.tmp ./android/gradle.properties

