import {
	call,
	FileSelectionType,
	openFilePicker,
	toaster
} from "@decky/api";
import {
	ButtonItem,
	definePlugin,
	PanelSection,
	PanelSectionRow,
	staticClasses,
	Dropdown,
	DropdownOption,
	SingleDropdownOption,
	Router,
	ToggleField,
	SliderField
} from "@decky/ui";

import {
	useState,
	useEffect,
	FC
} from "react";

import { FaVideo } from "react-icons/fa";

const defaultAppName = "Decky-Recorder";

class DeckyRecorderLogic
	{
	pressedAtStart: number = Date.now();
	pressedAtHome: number = Date.now();

	notify = async (message: string, duration: number = 1000, body: string = "") => {
		if (!body) {
			body = message;
		}
		await toaster.toast({
			title: message,
			body: body,
			duration: duration,
			critical: true
		});
	}

	saveRollingRecording = async  (duration: number) => {
		const res = await call<[clip_duration: number, app_name: string], number>("save_rolling_recording", duration, Router.MainRunningApp?.display_name ?? defaultAppName);
		let r = (res as number)
		if (r > 0) {
			await this.notify("Saved clip");
		} else if (r == 0) {
			await this.notify("Too early to record another clip");
		} else if (r == -1) {
			await this.notify("Enabling replay mode", 1500, "Steam + Start to save last 30 seconds");
		} else {
			await this.notify("ERROR: Could not save clip");
		}
	}

	toggleRolling = async (isRolling: boolean) => {
		if (!isRolling) {
			await call<[], number>("enable_rolling");
		} else {
			await call<[], number>("disable_rolling");
		}
	}

	toggleMicrophone = async (microphoneEnabled: boolean) => {
		if (!microphoneEnabled) {
			await call<[], number>("enable_microphone");
		} else {
			await call<[], number>("disable_microphone");
		}
	}

    toggleAppNamedDirectories = async  (appNamedDirectoriesEnabled: boolean) => {
        if (!appNamedDirectoriesEnabled) {
            await call<[], void>("enable_app_named_directories");
        } else {
            await call<[], void>("disable_app_named_directories");
        }
    }

	updateMicGain = async (newMicGain: number) => {
		await call<[new_gain: number], void>("update_mic_gain", newMicGain);
	}

	updateNoiseReductionPercent = async (newNoiseReductionPercent: number) => {
		await call<[new_percent: number], void>("update_noise_reduction_percent", newNoiseReductionPercent);
	}

	getParsedMicSources = async () => {
		let result = await call<[], string>("get_mic_sources");
		return JSON.parse(result);
	}

	handleButtonInput = async (controllerIndex: number, gamepadButton: any, isButtonPressed: boolean) => {
		console.debug(`Button input detected\nControllerIndex: ${controllerIndex}\nGamepad Button: ${gamepadButton}\nIs button pressed: ${isButtonPressed}`)
		if (isButtonPressed === false) {
			return;
		}

		// Continue only if Home has been pressed within the last 2s
		if (Date.now() - this.pressedAtHome < 2000) {
			console.log(`Home button was pressed less than 2s ago.\nLast pressed time: ${Date.now() - this.pressedAtHome}`)
		} else {
			console.log(`Home button was pressed more than 2s ago.\nLast pressed time: ${Date.now() - this.pressedAtHome}`)
			return;
		}
		
		// Check if the Start button was pressed
		if (gamepadButton == 36) {
			console.log("Steam + Start were pressed. Cutting recording ...");
			this.pressedAtStart = Date.now();
			(Router as any).DisableHomeAndQuickAccessButtons();
			setTimeout(() => {
				(Router as any).EnableHomeAndQuickAccessButtons();
			}, 1000)
			const isRolling = await call<[], boolean>("is_rolling");
			if (isRolling) {
				await this.saveRollingRecording(30);
			} else {
				await this.notify("Enabling replay mode", 1500, "Steam + Start to save last 30 seconds");
				this.toggleRolling(false);
			}
		} else {
			console.log(`Steam button was pressed, but start button was not\nExpected: 36. Got: ${gamepadButton}`)
		}
	}

	// handleCommandInput = async (...inputs: any[]) => {
	// 	for (const input of inputs) {
	// 		if (input.eAction === 65) {
	// 			console.log(`Home button was pressed\n${JSON.stringify(input)}`);
	// 			this.pressedAtHome = Date.now();
	// 		} else {
	// 			console.log(`Home button was not pressed\n${JSON.stringify(input)}`)
	// 		}
	// 	}
	// 	console.debug(`Command Input detected\nInputs: ${JSON.stringify(inputs)}`)
		
	// }

	handleHomePress = async (origHome: any, ...args: any) => {
		console.log("[Intercept] onGlobalMenuButtonDown → OnHomeButtonPressed");  
		this.pressedAtHome = Date.now();
		return origHome?.(...args);
	}

}


const DeckyRecorder: FC<{ logic: DeckyRecorderLogic }> = ({ logic }) => {

	const [isCapturing, setCapturing] = useState<boolean>(false);

	// const [mode, setMode] = useState<string>("localFile");

	const [isRolling, setRolling] = useState<boolean>(false);
	const [microphoneEnabled, setMicrophone] = useState<boolean>(false);

	const [buttonsEnabled, setButtonsEnabled] = useState<boolean>(true);

	const [micGain, setMicGain] = useState<number>(10);
	const [isEnhancedNoiseCancellation, setEnhancedNoiseCancellation] = useState<boolean>(false);
	const [noiseReductionPercent, setNoiseReductionPercent] = useState<number>(50);

	const [micSource, setMicSource] = useState<DropdownOption>({data: "NA", label: "Default Mic"});

	const [micSourcesList, setMicSourcesList] = useState<DropdownOption[]>([{data: "NA", label: "Default Mic"}]);

    const [appNamedDirectoriesEnabled, setAppNamedDirectoriesEnabled] = useState<boolean>(false);

	// const audioBitrateOption128 = { data: "128", label: "128 Kbps" } as SingleDropdownOption
	// const audioBitrateOption192 = { data: "192", label: "192 Kbps" } as SingleDropdownOption
	// const audioBitrateOption256 = { data: "256", label: "256 Kbps" } as SingleDropdownOption
	// const audioBitrateOption320 = { data: "320", label: "320 Kbps" } as SingleDropdownOption
	// const audioBitrateOptions: DropdownOption[] = [audioBitrateOption128,
	// 	audioBitrateOption192, audioBitrateOption256, audioBitrateOption320];
	// const [audioBitrate, setAudioBitrate] = useState<DropdownOption>(audioBitrateOption128);

	const [localFilePath, setLocalFilePath] = useState<string>("/home/deck/Videos");

	const formatOptionMp4 = { data: "mp4", label: "MP4" } as SingleDropdownOption
	const formatOptionMkv = { data: "mkv", label: "Matroska (.mkv)" } as SingleDropdownOption;
	const formatOptionMov = { data: "mov", label: "QuickTime (.mov)" } as SingleDropdownOption;
	const formatOptions: DropdownOption[] = [formatOptionMkv, formatOptionMp4, formatOptionMov];
	const [localFileFormat, setLocalFileFormat] = useState<DropdownOption>(formatOptionMp4);

	const initState = async () => {
		const getIsCapturingResponse = await call<[], boolean>("is_capturing");
		setCapturing(getIsCapturingResponse);

		const getIsRollingResponse = await call<[], boolean>("is_rolling");
		setRolling(getIsRollingResponse);

		const getMicEnabled = await call<[], boolean>("is_mic_enabled");
		setMicrophone(getMicEnabled);

		const getMicGain = await call<[], number>("get_mic_gain");
		setMicGain(getMicGain);

		const getEnhancedNoiseCancellation = await call<[], boolean>("enhanced_noise_binary_exists");
		setEnhancedNoiseCancellation(getEnhancedNoiseCancellation);

		const getNoiseReductionPercent = await call<[], number>("get_noise_reduction_percent");
		setNoiseReductionPercent(getNoiseReductionPercent);

		

		let getMicSource = await call<[], string>("get_mic_source");
		if (getMicSource == "NA") {
			getMicSource = await call<[], string>("get_default_mic");
			setMicSource({data: getMicSource, label: "Default Mic"})
		} else if (getMicSource.includes("alsa_input")){
			setMicSource({data: getMicSource, label: "Default Mic"})
		} else {
			setMicSource({data: getMicSource, label: getMicSource})
		}

		const getAppNamedDirectoriesEnabled = await call<[], boolean>("get_app_named_directories");
        setAppNamedDirectoriesEnabled(getAppNamedDirectoriesEnabled);

		// const getModeResponse = await serverAPI.callPluginMethod('get_current_mode', {});
		// setMode(getModeResponse.result as string);

		// const getAudioBitrateResponse = await serverAPI.callPluginMethod('get_audio_bitrate', {});
		// const audioBitrateResponseNumber: number = getAudioBitrateResponse.result as number;
		// switch (audioBitrateResponseNumber) {
		// 	case 128:
		// 		setAudioBitrate(audioBitrateOption128);
		// 		break;
		// 	case 192:
		// 		setAudioBitrate(audioBitrateOption192)
		// 		break;
		// 	case 256:
		// 		setAudioBitrate(audioBitrateOption256)
		// 		break;
		// 	case 320:
		// 		setAudioBitrate(audioBitrateOption320)
		// 		break;
		// 	default:
		// 		setAudioBitrate(audioBitrateOption128)
		// 		break;
		// }

		const getLocalFilepathResponse = await call<[], string>("get_local_filepath");
		setLocalFilePath(getLocalFilepathResponse);

		const getLocalFileFormatResponse = await call<[], string>("get_local_fileformat");
		const localFileFormatResponseString: string = getLocalFileFormatResponse;
		if (localFileFormatResponseString == "mp4") {
			setLocalFileFormat(formatOptionMp4)
		} else if (localFileFormatResponseString == "mkv") {
			setLocalFileFormat(formatOptionMkv)
		} else if (localFileFormatResponseString == "mov") {
			setLocalFileFormat(formatOptionMov)
		} else {
			// should never happen? default back to mp4
			setLocalFileFormat(formatOptionMp4)
		}

	}

	const recordingButtonPress = async () => {
		if (isCapturing === false) {
			setCapturing(true);
			await call<[app_name: string], void>('start_capturing', Router.MainRunningApp?.display_name ?? defaultAppName);
			Router.CloseSideMenus();
		} else {
			setCapturing(false);
			await call<[]>('stop_capturing');
		}
	}

	const pickFolder = async () => {
		const filePickerResponse = await openFilePicker(FileSelectionType.FOLDER, localFilePath, false);
		setLocalFilePath(filePickerResponse.path)
		await call<[localFilePath: string], void>("set_local_filepath", filePickerResponse.path);
	}

	const rollingRecordButtonPress = async (duration: number) => {
		setButtonsEnabled(false);
		setTimeout(() => {
			setButtonsEnabled(true);
		}, 1000);
		logic.saveRollingRecording(duration);
	}

	const shouldButtonsBeEnabled = () => {
		if (!isCapturing) {
			return false;
		}
		if (!buttonsEnabled) {
			return false;
		}
		return true;
	}

	const disableFileformatDropdown = () => {
		if (isCapturing) {
			return true;
		}
		if (isRolling) {
			return true;
		}
		return false;
	}

	const rollingToggled = async () => {
		logic.toggleRolling(isRolling);
		setCapturing(!isRolling);
		setRolling(!isRolling);
	}

	const microphoneToggled = async () => {
		logic.toggleMicrophone(microphoneEnabled);
	}

    const appNamedDirectoriesToggled = async () => {
        logic.toggleAppNamedDirectories(appNamedDirectoriesEnabled);
    }

	const changeMicGain = async () => {
		logic.updateMicGain(micGain)
	}

	const changeNoiseReductionPercent = async () => {
		logic.updateNoiseReductionPercent(noiseReductionPercent)
	}

	const getMicSources = async () => {
		const parsedMicSources = await logic.getParsedMicSources()
		setMicSourcesList(parsedMicSources)
	}

	const getFilePickerText = (): string => {
		return "Recordings will be saved to " + localFilePath;
	}

	const getRecordingButtonText = (): string => {
		if (isCapturing === false) {
			return "Start Recording";
		} else {
			return "Stop Recording";
		}
	}

	useEffect(() => {
		initState();
	}, []);

	return (
		<PanelSection>

			<PanelSectionRow>
				<ToggleField
					label="Replay Mode"
					checked={isRolling}
					onChange={(e) => { setRolling(e); rollingToggled(); }}
				/>
				<div><s>Steam + Start saves a 30 second clip in replay mode. If replay mode is off, this shortcut will enable it.</s></div>
                <div>Shortcut is currently non-functional. Please record manually using the options below</div>

                <PanelSectionRow>
                    <ToggleField
                        label="App Named Directories"
                        disabled={isCapturing}
                        checked={appNamedDirectoriesEnabled}
                        onChange={(e) => { setAppNamedDirectoriesEnabled(e); appNamedDirectoriesToggled(); }}
                    />
                    <div>Save recordings to directories based on the name of the currently running application.</div>
                </PanelSectionRow>
				<ToggleField
					label="Enable Microphone Recording"
					checked={microphoneEnabled}
					onChange={(e) => { setMicrophone(e); microphoneToggled(); }}
				/>
				<div>Enable recording of echo-cancelled microphone</div>
				{
					(microphoneEnabled) ?
					<div>
						<SliderField
							label="Microphone Gain (default 10db)"
							value={micGain}
							resetValue={10}
							min={0}
							max={20}
							step={1}
							showValue={true}
							editableValue={true}
							onChange={(e) => { setMicGain(e); changeMicGain(); }}
						/>
						{
							(isEnhancedNoiseCancellation) ?
							<SliderField
								label="Noise Reduction (default 50%)"
								value={noiseReductionPercent}
								resetValue={50}
								min={0}
								max={100}
								step={2}
								showValue={true}
								editableValue={true}
								onChange={(e) => { setNoiseReductionPercent(e); changeNoiseReductionPercent(); }}
							/> : null
						}
						<PanelSectionRow>
							<Dropdown
								menuLabel="Select the Microphone Source"
								strDefaultLabel={micSource.label as string}
								rgOptions={micSourcesList}
								selectedOption={micSource}
								onMenuWillOpen={(showMenu: () => void) => {
									getMicSources()
									showMenu()
								}}
								onChange={(newSource) => {
									setMicSource(newSource.data);
									call<[new_mic_source: any], boolean>("set_mic_source", newSource.data);
								}}
							/>
						</PanelSectionRow>
						<div>Select the Microphone Source</div>
					</div> : null
				}
				{(!isRolling) ?
					<div>

						<ButtonItem
							bottomSeparator="none"
							layout="below"
							onClick={() => {
								recordingButtonPress();
							}}>
							{getRecordingButtonText()}
						</ButtonItem>

						<ButtonItem
							label={getFilePickerText()}
							bottomSeparator="none"
							layout="below"
							onClick={() => {
								pickFolder();
							}}>
							{"Set folder"}
						</ButtonItem>


					</div> : null
				}
			</PanelSectionRow>

			<PanelSectionRow>
				<Dropdown
					menuLabel="Select the video file format"
					disabled={disableFileformatDropdown()}
					strDefaultLabel={localFileFormat.label as string}
					rgOptions={formatOptions}
					selectedOption={localFileFormat}
					onChange={(newLocalFileFormat) => {
						call<[fileformat: DropdownOption], void>("set_local_fileformat", newLocalFileFormat.data);
						setLocalFileFormat(newLocalFileFormat);
					}}
				/>
			</PanelSectionRow>

			{(isRolling)
				? <PanelSectionRow><ButtonItem disabled={!shouldButtonsBeEnabled()} onClick={() => { rollingRecordButtonPress(30) }}>30 sec</ButtonItem></PanelSectionRow> : null}

			{(isRolling)
				? <PanelSectionRow><ButtonItem disabled={!shouldButtonsBeEnabled()} onClick={() => { rollingRecordButtonPress(45) }}>45 sec</ButtonItem></PanelSectionRow> : null}

			{(isRolling)
				? <PanelSectionRow><ButtonItem disabled={!shouldButtonsBeEnabled()} onClick={() => { rollingRecordButtonPress(60) }}>1 min</ButtonItem></PanelSectionRow> : null}

			{(isRolling)
				? <PanelSectionRow><ButtonItem disabled={!shouldButtonsBeEnabled()} onClick={() => { rollingRecordButtonPress(60 * 2) }}>2 min</ButtonItem></PanelSectionRow> : null}

			{(isRolling)
				? <PanelSectionRow><ButtonItem disabled={!shouldButtonsBeEnabled()} onClick={() => { rollingRecordButtonPress(60 * 3) }}>3 min</ButtonItem></PanelSectionRow> : null}

			{(isRolling)
				? <PanelSectionRow><ButtonItem disabled={!shouldButtonsBeEnabled()} onClick={() => { rollingRecordButtonPress(60 * 5) }}>5 min</ButtonItem></PanelSectionRow> : null}

		</PanelSection>
	);

};


export default definePlugin(() => {
	let logic = new DeckyRecorderLogic();
	let input_register = window.SteamClient.Input.RegisterForControllerInputMessages(logic.handleButtonInput);
	return {
		title: <div className={staticClasses.Title}>Decky Recorder</div>,
		content: <DeckyRecorder logic={logic} />,
		icon: <FaVideo />,
		onDismount() {
			input_register.unregister();
		},
		alwaysRender: true
	};
});
