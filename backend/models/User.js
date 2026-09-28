const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    favoriteCities: [
      {
        name: { type: String, required: true },
        country: { type: String },
        lat: { type: Number, required: true },
        lon: { type: Number, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    preferences: {
      units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
      alerts: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Free plan is limited to 3 saved cities per the freemium business model.
UserSchema.methods.canAddFavorite = function canAddFavorite() {
  if (this.plan === 'premium') return true;
  return this.favoriteCities.length < 3;
};

UserSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    plan: this.plan,
    favoriteCities: this.favoriteCities,
    preferences: this.preferences,
  };
};

module.exports = mongoose.model('User', UserSchema);
