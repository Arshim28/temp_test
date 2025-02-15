import { motion } from "framer-motion";
import "./LoadingScreen.css";

export default function LoadingScreen({ message = "Fetching data, please wait..." }) {
    return (
        <div className="loading-container">
            <motion.div
                className="spinner"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            />
            <p className="loading-text">{message}</p>
        </div>
    );
}
