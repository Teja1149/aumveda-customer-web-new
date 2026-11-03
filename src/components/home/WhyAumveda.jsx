import {
    BadgeCheck,
    Headphones,
    Search,
    ShoppingBag
} from "lucide-react";

import {
    motion
} from "framer-motion";

import "../../styles/why-aumveda.css";


function WhyAumveda() {

    const features = [

        {
            icon:
                Search,

            title:
                "Easy Discovery",

            description:
                "Explore wellness products across categories and find what fits your everyday routine."
        },

        {
            icon:
                ShoppingBag,

            title:
                "Simple Shopping",

            description:
                "Browse products, manage your cart and move through checkout with ease."
        },

        {
            icon:
                BadgeCheck,

            title:
                "Clear Product Choices",

            description:
                "Compare products, prices, ratings and available options before you decide."
        },

        {
            icon:
                Headphones,

            title:
                "Customer Support",

            description:
                "Get help with your AUMVEDA shopping experience whenever you need assistance."
        }

    ];


    return (

        <section
            className="why-aumveda"
            aria-labelledby="why-aumveda-title"
        >

            <div
                className="why-aumveda__inner"
            >


                {/* HEADER */}

                <motion.div
                    className="why-aumveda__header"
                    initial={{
                        opacity: 0,
                        y: 18
                    }}
                    whileInView={{
                        opacity: 1,
                        y: 0
                    }}
                    viewport={{
                        once: true,
                        amount: 0.25
                    }}
                    transition={{
                        duration: 0.45
                    }}
                >

                    <div
                        className="why-aumveda__eyebrow"
                    >

                        <span />

                        WHY AUMVEDA

                        <span />

                    </div>


                    <h2
                        id="why-aumveda-title"
                    >
                        Shopping made
                        <span>
                            simple.
                        </span>
                    </h2>


                    <p>
                        Everything you need to
                        discover, compare and shop
                        wellness products in one
                        convenient experience.
                    </p>

                </motion.div>


                {/* FEATURE GRID */}

                <div
                    className="why-aumveda__grid"
                >

                    {
                        features.map(
                            (
                                feature,
                                index
                            ) => {

                                const Icon =
                                    feature.icon;


                                return (

                                    <motion.article
                                        key={
                                            feature.title
                                        }
                                        className="why-aumveda__card"
                                        initial={{
                                            opacity: 0,
                                            y: 20
                                        }}
                                        whileInView={{
                                            opacity: 1,
                                            y: 0
                                        }}
                                        viewport={{
                                            once: true,
                                            amount: 0.2
                                        }}
                                        transition={{
                                            duration: 0.42,
                                            delay:
                                                index *
                                                0.07
                                        }}
                                        whileHover={{
                                            y: -5
                                        }}
                                    >

                                        <div
                                            className="why-aumveda__icon"
                                        >

                                            <Icon
                                                size={22}
                                                strokeWidth={1.7}
                                            />

                                        </div>


                                        <div
                                            className="why-aumveda__number"
                                        >

                                            0
                                            {
                                                index + 1
                                            }

                                        </div>


                                        <h3>
                                            {
                                                feature.title
                                            }
                                        </h3>


                                        <p>
                                            {
                                                feature.description
                                            }
                                        </p>

                                    </motion.article>

                                );

                            }
                        )
                    }

                </div>

            </div>

        </section>

    );

}


export default WhyAumveda;