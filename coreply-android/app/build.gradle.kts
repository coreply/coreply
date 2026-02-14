plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "app.coreply.coreplyapp"
    compileSdk = 36
    defaultConfig {
        applicationId = "app.coreply.coreplyapp"
        minSdk = 26
        targetSdk = 36
        versionCode = 14
        versionName = "2.3.0"
        vectorDrawables.useSupportLibrary = true
    }
    buildFeatures {
        compose = true
    }
    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

kotlin{
    jvmToolchain(21)
}
val ktor_version: String by project
val kotlin_version: String by project

dependencies {
    implementation(fileTree(mapOf("dir" to "libs", "include" to listOf("*.jar"))))
    implementation("com.aallam.openai:openai-client:4.0.1")
    implementation("io.ktor:ktor-client-android:$ktor_version")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("org.jetbrains.kotlin:kotlin-stdlib:2.3.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    
    val preferenceVersion = "1.2.1"
    implementation("androidx.preference:preference-ktx:$preferenceVersion")
    
    // Jetpack Compose BOM
    implementation(platform("androidx.compose:compose-bom:2026.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.12.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.compose.runtime:runtime-livedata")
    implementation("androidx.datastore:datastore-preferences:1.2.0")
    implementation("androidx.compose.ui:ui-text-google-fonts:1.10.3")

    implementation("com.squareup.okhttp3:okhttp:5.3.2")
}
