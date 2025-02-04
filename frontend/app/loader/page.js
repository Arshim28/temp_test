import { motion } from "framer-motion";
import "./LoadingScreen.css";

export default function LoadingScreen() {
    return (
        <div className="loading-container">
            <motion.div
                className="spinner"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            <p className="loading-text">Fetching data, please wait...</p>
        </div>
    );
}
