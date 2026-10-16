import HomeHero from "./home-v2/HomeHero";
import EfemeridesCarousel from "./home-v2/EfemeridesCarousel";
import MetricsCards from "./home-v2/MetricsCards";
import ProgressBanner from "./home-v2/ProgressBanner";
// import TodayTasks from "./home-v2/TodayTasks";
// import NewsSection from "./home-v2/NewsSection";
// import ActivityTimeline from "./home-v2/ActivityTimeline";

export default function OperatorHome({ onNavigate }) {

    return (

        <>

            <HomeHero />

            <EfemeridesCarousel />

            <MetricsCards onNavigate={onNavigate} />

            <ProgressBanner onNavigate={onNavigate} />

            {/* <TodayTasks /> */}

            {/* <NewsSection /> */}

            {/* <ActivityTimeline /> */}

        </>

    );

}


