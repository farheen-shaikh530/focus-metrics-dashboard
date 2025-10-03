import { motion } from "framer-motion";
import type { Variants, Transition } from "framer-motion";
import KanbanBoard from "./KanbanBoard";
import WeeklyProgressChart from "../components/WeeklyProgressChart";
import ProductivityPanel from "../components/ProductivityPanel";


// define transition separately so TypeScript knows it's a "spring"
const spring: Transition = { type: "spring", stiffness: 70, damping: 14 };

const container: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: spring },
};

export default function Dashboard() {
  return (
    <motion.div className="p-4" variants={container} initial="hidden" animate="show">
      <motion.h2
        className="text-xl font-bold mb-4"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05 }}
      >
       
      </motion.h2>
      <motion.h2 /* ... */>Dashboard Overview</motion.h2>
<WeeklyProgressChart weeks={8} />

      <KanbanBoard />
    </motion.div>
  );
}
