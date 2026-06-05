import mongoose from 'mongoose';

const caregiverSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  specialties: {
    type: [String],
    default: [],
  },
  experienceYears: {
    type: Number,
    default: 0,
  },
  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  recommendationWeight: {
    type: Number,
    default: 1,
  },
  bio: {
    type: String,
    default: '',
  },
  certifications: {
    type: [String],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

caregiverSchema.methods.updateWeight = function (rating) {
  if (rating > 3) {
    this.recommendationWeight = Math.min(this.recommendationWeight + 0.1, 2);
  } else if (rating < 3) {
    this.recommendationWeight = Math.max(this.recommendationWeight - 0.2, 0.1);
  }
  return this.recommendationWeight;
};

caregiverSchema.methods.addReview = function (newRating) {
  const totalScore = this.rating * this.totalReviews + newRating;
  this.totalReviews += 1;
  this.rating = totalScore / this.totalReviews;
  this.updateWeight(newRating);
  return this.save();
};

export default mongoose.model('Caregiver', caregiverSchema);
