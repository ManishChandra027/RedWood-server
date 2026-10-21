import { Address } from "../models/address.model.js";
import ApiError from "../utils/ApiError.js";

const isDuplicateDefaultError = (error) => error?.code === 11000;

const findOwnedAddress = async (userId, addressId) => {
    const address = await Address.findOne({ _id: addressId, user: userId });

    if (!address) {
        throw new ApiError(404, "Address not found.");
    }

    return address;
};

const resolveDefaultAddress = async (userId) => {
    const addresses = await Address.find({ user: userId }).sort({
        isDefault: -1,
        updatedAt: -1,
        createdAt: -1,
    });

    if (addresses.length === 0) {
        return null;
    }

    const defaultAddresses = addresses.filter((address) => address.isDefault);
    const selectedAddress = defaultAddresses[0] || addresses[0];

    if (defaultAddresses.length > 1) {
        await Address.updateMany(
            {
                user: userId,
                _id: { $ne: selectedAddress._id },
                isDefault: true,
            },
            { $set: { isDefault: false } }
        );
    }

    if (!selectedAddress.isDefault) {
        try {
            await Address.updateOne(
                { _id: selectedAddress._id, user: userId },
                { $set: { isDefault: true } }
            );
        } catch (error) {
            if (!isDuplicateDefaultError(error)) {
                throw error;
            }
        }

        const concurrentlySelectedDefault = await Address.findOne({
            user: userId,
            isDefault: true,
        });

        if (concurrentlySelectedDefault) {
            return concurrentlySelectedDefault;
        }
    }

    return selectedAddress;
};

const setDefaultAddress = async (userId, addressId) => {
    const address = await findOwnedAddress(userId, addressId);

    if (address.isDefault) {
        return address;
    }

    await Address.updateMany(
        { user: userId, isDefault: true },
        { $set: { isDefault: false } }
    );

    try {
        return await Address.findOneAndUpdate(
            { _id: addressId, user: userId },
            { $set: { isDefault: true } },
            { new: true, runValidators: true }
        );
    } catch (error) {
        if (isDuplicateDefaultError(error)) {
            throw new ApiError(
                409,
                "Another address was made default at the same time. Reload your addresses and try again."
            );
        }

        throw error;
    }
};

const listAddresses = async (userId) => {
    const defaultAddress = await resolveDefaultAddress(userId);
    const addresses = await Address.find({ user: userId }).sort({
        isDefault: -1,
        updatedAt: -1,
        createdAt: -1,
    });

    return { addresses, defaultAddress };
};

const createAddress = async (userId, addressData) => {
    const currentDefault = await resolveDefaultAddress(userId);
    const makeDefault = !currentDefault || addressData.isDefault === true;
    const address = await Address.create({
        ...addressData,
        user: userId,
        isDefault: false,
    });

    if (makeDefault) {
        try {
            await setDefaultAddress(userId, address._id);
        } catch (error) {
            await Address.deleteOne({ _id: address._id, user: userId });
            throw error;
        }
    }

    return Address.findOne({ _id: address._id, user: userId });
};

const updateAddress = async (userId, addressId, addressData) => {
    let address = await findOwnedAddress(userId, addressId);
    const { isDefault, ...fieldsToUpdate } = addressData;

    if (isDefault === false && address.isDefault) {
        throw new ApiError(
            409,
            "Choose another default address before changing this one."
        );
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
        address = await Address.findOneAndUpdate(
            { _id: addressId, user: userId },
            { $set: fieldsToUpdate },
            { new: true, runValidators: true }
        );
    }

    if (isDefault === true) {
        address = await setDefaultAddress(userId, addressId);
    }

    return address;
};

const deleteAddress = async (userId, addressId) => {
    await resolveDefaultAddress(userId);
    const address = await findOwnedAddress(userId, addressId);

    if (address.isDefault) {
        throw new ApiError(
            409,
            "Set another address as default before deleting this address."
        );
    }

    const deletedAddress = await Address.findOneAndDelete({
        _id: addressId,
        user: userId,
        isDefault: false,
    });

    if (!deletedAddress) {
        throw new ApiError(
            409,
            "This address is now the default. Set another address as default before deleting it."
        );
    }

    return deletedAddress;
};

export {
    createAddress,
    deleteAddress,
    listAddresses,
    resolveDefaultAddress as getDefaultAddressForUser,
    updateAddress,
};
