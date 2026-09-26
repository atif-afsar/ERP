import { PulseFitHero } from "@/components/ui/pulse-fit-hero";

export default function PulseFitHeroDemo() {
  return (
    <PulseFitHero
      logo="PulseFit"
      navigation={[
        { label: "Features", onClick: () => console.log("Features") },
        { label: "Programs", hasDropdown: true, onClick: () => console.log("Programs") },
        { label: "Testimonials", onClick: () => console.log("Testimonials") },
        { label: "Pricing", onClick: () => console.log("Pricing") },
        { label: "Contact", onClick: () => console.log("Contact") },
      ]}
      ctaButton={{
        label: "Get Free Trial",
        onClick: () => console.log("Get Free Trial"),
      }}
      title="Train smarter. Anywhere. Anytime."
      subtitle="Guided fitness sessions tailored to your goals - whether it's strength, endurance, or flexibility. Streamlined, motivating, and accessible 24/7."
      primaryAction={{
        label: "Start training",
        onClick: () => console.log("Start training"),
      }}
      secondaryAction={{
        label: "Browse programs",
        onClick: () => console.log("Browse programs"),
      }}
      disclaimer="*No credit card required"
      socialProof={{
        avatars: [
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
        ],
        text: "Join over 10,000+ people",
      }}
      programs={[
        {
          image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&h=800&fit=crop",
          category: "BEGINNER",
          title: "Jumping challenge",
          onClick: () => console.log("Jumping challenge"),
        },
        {
          image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=800&fit=crop",
          category: "INTERMEDIATE",
          title: "Core stability flow",
          onClick: () => console.log("Core stability flow"),
        },
        {
          image: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600&h=800&fit=crop",
          category: "ADVANCED",
          title: "Trail sprint challenge",
          onClick: () => console.log("Trail sprint challenge"),
        },
        {
          image: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&h=800&fit=crop",
          category: "ALL LEVELS",
          title: "Full-body bootcamp",
          onClick: () => console.log("Full-body bootcamp"),
        },
        {
          image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=800&fit=crop",
          category: "RECOVERY",
          title: "Mobility & Recovery",
          onClick: () => console.log("Mobility & Recovery"),
        },
      ]}
    />
  );
}
