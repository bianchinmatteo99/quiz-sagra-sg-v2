import { MDUtils } from "../../md.utils";
import { GameDefinition, GameDefinitionBuilder } from "../games.admin.base";
import { ZipGameDefinitionData, ZipGameRequiredData } from "./zip.contracts";

export type ZipGameDefinition = GameDefinition<ZipGameDefinitionData>;

export class ZipGameDefinitionBuilder implements GameDefinitionBuilder<ZipGameDefinitionData> {
    parseFromMD(md: string): ZipGameDefinitionData {
        const parsed = MDUtils.parseSectionContent(md);
        MDUtils.ensureOnlyAllowedKeys(parsed, [
            "title",
            "time_for_answer",
            "can_retry_for_same_zip",
            "zips",
            "points_for_correct_answer",
        ], "Zip markdown");

        const title = MDUtils.parseString(parsed, "title", ZipGameRequiredData.name);
        const timeForAnswer = MDUtils.parseNumber(parsed, "time_for_answer", 0);
        const canRetryForSameZip = MDUtils.parseBoolean(parsed, "can_retry_for_same_zip", true);
        const pointsForCorrectAnswer = MDUtils.parseNumber(parsed, "points_for_correct_answer");
        const zips = MDUtils.parseStringList(parsed, "zips").map((zipLine, index) => {
            const zip = zipLine.split(",").map((word) => word.trim());
            if (zip.some((word) => word.length === 0)) {
                throw new Error(`Zip key "zips" entry at index ${index} cannot contain empty items`);
            }
            return zip;
        });

        if (timeForAnswer < 0) {
            throw new Error(`Zip key "time_for_answer" must be >= 0, received ${timeForAnswer}`);
        }
        if (pointsForCorrectAnswer < 0) {
            throw new Error(`Zip key "points_for_correct_answer" must be >= 0, received ${pointsForCorrectAnswer}`);
        }
        if (zips.length === 0) {
            throw new Error('Zip key "zips" must contain at least one item');
        }

        return {
            ...ZipGameRequiredData,
            title,
            timeForAnswer,
            canRetryForSameZip,
            zips,
            pointsForCorrectAnswer,
        };
    }

    parseFromJSON(data: Partial<ZipGameDefinitionData>): ZipGameDefinitionData {
        return {
            ...ZipGameRequiredData,
            title: data.title ?? ZipGameRequiredData.name,
            timeForAnswer: data.timeForAnswer ?? 0,
            canRetryForSameZip: data.canRetryForSameZip ?? true,
            zips: data.zips ?? [],
            pointsForCorrectAnswer: data.pointsForCorrectAnswer ?? 10,
        };
    }
}