# Kepler Health

A sophisticated health & fitness dashboard inspired by Whoop, built for Fitbit users.

Kepler Health aggregates your Fitbit data to calculate advanced metrics like **Strain**, **Recovery**, and **Sleep Performance**, visualizing them in a sleek, dark-mode interface designed for high-performance athletes.

![Dashboard Preview](docs/dashboard-preview.png)

## 🚀 Features

*   **Strain Score**: Calculates daily cardiovascular load based on heart rate zones, calories, and active minutes.
*   **Recovery Score**: Analysis of HRV, Resting Heart Rate, and Sleep to determine your readiness to train (Green/Yellow/Red).
*   **Sleep Performance**: Detailed breakdown of sleep stages, efficiency, and sleep need vs. actual sleep.
*   **Health Monitor**: Live view of vital signs including SpO2, Skin Temperature, and Breathing Rate.
*   **Trends**: Long-term analysis of your metrics to spot improvement or fatigue.
*   **Weekly Report**: A summarized report card of your week's performance.

## 🛠️ Technology Stack

*   **Frontend**: React 18, Vite
*   **Styling**: TailwindCSS
*   **Charts**: Recharts
*   **Mobile**: Ionic Capacitor (Android)
*   **API**: Fitbit Web API

## 📦 Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/geoffkip/Kepler.git
    cd Kepler
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    VITE_FITBIT_CLIENT_ID=your_client_id
    VITE_FITBIT_REDIRECT_URI=http://localhost:5173/callback
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```

## 📱 Mobile Build (Android)

This project uses Capacitor to wrap the React app for Android.

1.  **Sync Web Assets**
    ```bash
    npm run build
    npx cap sync
    ```

2.  **Build APK**
    Ensure Java JDK 17+ is installed.
    ```bash
    cd android
    ./gradlew assembleDebug
    ```
    The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## 📄 License

MIT
