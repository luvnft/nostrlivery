import React, {useEffect} from "react"
import {Image, StyleSheet, Text, TextInput, TouchableOpacity, View,} from "react-native"
import {StorageService, StoredKey} from "../service/StorageService"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import {NodeService} from "../service/NodeService"
import Toast from "react-native-toast-message"
import ActionButton from "./ActionButton"
import {NostrService} from "../service/NostrService"
import {isValidLatitude, isValidLongitude} from "../util/validationUtils"

// @ts-ignore
export const ProfileScreen = ({navigation, route}) => {
    const [profile, setProfile] = React.useState<any>({})
    const [nodeUrl, setNodeUrl] = React.useState<string>("")
    const [latitude, setLatitude] = React.useState<string>("")
    const [longitude, setLongitude] = React.useState<string>("")

    const [disabledNodeUrlBtn, setDisabledNodeUrlBtn] =
        React.useState<boolean>(true)
    const storageService = new StorageService()
    const nodeService = new NodeService()
    const nostrService = new NostrService()

    useEffect(() => {
        storageService.get(StoredKey.NODE_URL).then((data) => {
            if (!data) {
                navigation.navigate("NodeSelectionScreen")
            }
            setNodeUrl(data)
        })

        storageService.get(StoredKey.PROFILE).then((data) => {
            if (!data) {
                navigation.navigate("Login")
            }
            setProfile(data)
            setLongitude(data.location.longitude)
            setLatitude(data.location.latitude)
        })
    }, [])

    useEffect(() => {
        storageService.get(StoredKey.NODE_URL).then((data) => {
            if (nodeUrl !== data && nodeUrl !== "") {
                setDisabledNodeUrlBtn(false)
            } else {
                setDisabledNodeUrlBtn(true)
            }
        })
    }, [nodeUrl])

    function navigateToHome() {
        navigation.navigate("Home")
    }

    function handleSaveNodeUrl() {
        const nodeService = new NodeService()

        nodeService
            .getNodeIdentity(nodeUrl)
            .then((_) => {
                setDisabledNodeUrlBtn(true)
                Toast.show({
                    type: "success",
                    text1: "Node url saved",
                })
            })
            .catch((e) => {
                Toast.show({
                    type: "error",
                    text1: e,
                })
            })
    }

    function handleUpdateLocation() {
        if(!isValidLatitude(latitude)) {
            Toast.show({
                type: "error",
                text1: "Invalid latitude",
            })
            return
        }

        if(!isValidLongitude(longitude)) {
            Toast.show({
                type: "error",
                text1: "Invalid longitude",
            })
            return
        }

        const profileWithLocation = {...profile, location: { latitude, longitude}}

        storageService.get(StoredKey.NSEC).then(async nsec => {
            const profileUpdateEvent = nostrService.signNostrEvent(nsec, 0, [], profileWithLocation)
            const event = nostrService.signNostrliveryEvent(nsec, "PUBLISH_EVENT", {event: profileUpdateEvent})

            try {
                await nodeService.postEvent(event)
                await storageService.set(StoredKey.PROFILE, profileWithLocation)
                Toast.show({
                    type: "success",
                    text1: "Location updated",
                })
            } catch (e) {
                console.log(e)
            }
        }).catch((e) => {
            Toast.show({
                type: "error",
                text1: e,
            })
        })

    }

    function handleLogout() {
        storageService.remove(StoredKey.PROFILE).then()
        storageService.remove(StoredKey.NSEC).then()
        navigation.navigate("Login")
    }

    return (
        <View style={styles.profileContainer}>
            <TouchableOpacity style={styles.closeBtn} onPress={navigateToHome}>
                <MaterialCommunityIcons name="close" color={"#000"} size={35}/>
            </TouchableOpacity>
            <View style={styles.basicInfoContainer}>
                <View style={styles.nameInfo}>
                    <Text style={{fontWeight: "500", fontSize: 30}}>
                        {profile.display_name}
                    </Text>
                    <Text style={{fontSize: 15, marginBottom: 10}}>
                        @{profile.name}
                    </Text>
                </View>
                <View style={styles.profilePicContainer}>
                    <View style={{width: 80, height: 80}}>
                        <Image
                            style={{
                                borderRadius: 40,
                                width: 80,
                                height: 80,
                                padding: 0,
                            }}
                            source={{
                                uri: profile.picture,
                            }}
                            alt="profile_picture"
                        />
                    </View>
                </View>
            </View>
            <View>
                <Text style={{fontSize: 16}}>Node Url</Text>
                <TextInput
                    style={styles.input}
                    value={nodeUrl}
                    onChangeText={setNodeUrl}
                />
                <ActionButton
                    disabled={disabledNodeUrlBtn}
                    title={"Save"}
                    color={"purple"}
                    onPress={handleSaveNodeUrl}
                />
            </View>
            <View>
                <Text style={{fontSize: 16, marginBottom: "2%"}}>Location</Text>
                <Text style={{fontSize: 16}}>Latitude</Text>
                <TextInput
                    style={styles.input}
                    value={latitude}
                    keyboardType={"numeric"}
                    onChangeText={setLatitude}
                />
                <Text style={{fontSize: 16}}>Longitude</Text>
                <TextInput
                    style={styles.input}
                    value={longitude}
                    onChangeText={setLongitude}
                />
                <ActionButton
                    title={"Update"}
                    color={"purple"}
                    onPress={handleUpdateLocation}
                />
            </View>
            <View>
                <Text style={{fontSize: 16}}>Session</Text>
                <ActionButton title={"Logout"} color={"red"} onPress={handleLogout}/>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    profileContainer: {
        display: "flex",
        flexDirection: "column",
        padding: 20,
        paddingTop: 25,
        gap: 15,
    },
    basicInfoContainer: {
        display: "flex",
        flexDirection: "row",
        marginTop: 10,
        gap: 10,
    },
    nameInfo: {
        display: "flex",
        flexGrow: 3,
        justifyContent: "center",
    },
    profilePicContainer: {
        display: "flex",
        alignItems: "flex-end",
        alignContent: "flex-end",
        paddingTop: 8,
    },
    closeBtn: {
        position: "absolute",
        top: 2,
        right: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
        marginBottom: "2%",
    },
})
